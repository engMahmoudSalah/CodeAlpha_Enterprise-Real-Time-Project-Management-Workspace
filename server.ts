import express from 'express';
import http from 'http';
import path from 'path';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer as createViteServer } from 'vite';
import nodemailer, { type Transporter } from 'nodemailer';

// Active WebSocket connections tracking
interface ExtendedWebSocket extends WebSocket {
  userId?: string;
  projectId?: string;
  isAlive?: boolean;
}

const clients = new Set<ExtendedWebSocket>();

function broadcastToProject(projectId: string, message: any, excludeWs?: WebSocket) {
  const data = JSON.stringify(message);
  for (const client of clients) {
    if (client.readyState === WebSocket.OPEN && client.projectId === projectId && client !== excludeWs) {
      client.send(data);
    }
  }
}

function broadcastPresence(projectId: string) {
  if (!projectId) return;
  const projectUsers: { userId: string }[] = [];
  const seenUserIds = new Set<string>();

  for (const client of clients) {
    if (client.readyState === WebSocket.OPEN && client.projectId === projectId && client.userId) {
      if (!seenUserIds.has(client.userId)) {
        seenUserIds.add(client.userId);
        projectUsers.push({ userId: client.userId });
      }
    }
  }

  broadcastToProject(projectId, {
    type: 'presence:update',
    projectId,
    payload: { activeUsers: projectUsers },
  });
}

// Mailer Setup & Providers
async function sendViaResend(to: string, subject: string, html: string): Promise<{ success: boolean; messageId?: string; error?: string; isTestingRestriction?: boolean }> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) return { success: false, error: 'No Resend API Key' };

  try {
    const fromAddress = process.env.RESEND_FROM_EMAIL?.trim() || 'Velocity Workspace <onboarding@resend.dev>';
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromAddress,
        to: [to],
        subject,
        html,
      }),
    });

    const data: any = await response.json().catch(() => ({}));
    if (!response.ok || data.statusCode >= 400 || data.name === 'validation_error') {
      const isTestingRestriction = data.statusCode === 403 || data.name === 'validation_error';
      return {
        success: false,
        error: data.message || 'Resend validation or delivery error',
        isTestingRestriction,
      };
    }

    return { success: true, messageId: data.id };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

let smtpTransporter: Transporter | null = null;
function getSmtpTransporter(): Transporter | null {
  const host = process.env.SMTP_HOST?.trim();
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS?.trim();
  const port = Number(process.env.SMTP_PORT) || 587;
  const secure = process.env.SMTP_SECURE === 'true';

  if (!host || !user || !pass) return null;

  if (!smtpTransporter) {
    smtpTransporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: { user, pass },
    });
  }
  return smtpTransporter;
}

async function startServer() {
  if (process.env.RESEND_API_KEY) {
    console.log('✅ Resend email integration detected and ready.');
  }
  if (process.env.SMTP_HOST && process.env.SMTP_USER) {
    console.log('ℹ️ SMTP email integration detected and ready.');
  }

  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // ================= API ROUTES =================

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      time: new Date().toISOString(),
      emailConfigured: !!(process.env.RESEND_API_KEY || (process.env.SMTP_HOST && process.env.SMTP_PASS)),
      emailProvider: process.env.RESEND_API_KEY ? 'resend' : (process.env.SMTP_HOST ? 'smtp' : 'none'),
    });
  });

  // Real Email Sending Endpoint (Resend with automatic SMTP fallback)
  app.post('/api/send-invite', async (req, res) => {
    const { to, projectName, inviterName, role, note, token } = req.body;
    
    if (!to || !projectName) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const appUrl = req.headers.origin || 'http://localhost:3000';
    const inviteUrl = token ? `${appUrl}?invite=${token}` : appUrl;

    const emailHtml = `
      <div dir="rtl" style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; max-width: 580px; margin: 0 auto; padding: 32px 24px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff; text-align: right;">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px; border-bottom: 1px solid #f1f5f9; padding-bottom: 16px;">
          <div style="display: flex; align-items: center; gap: 12px;">
            <div style="width: 40px; height: 40px; background: linear-gradient(135deg, #6366f1, #4f46e5); border-radius: 12px; display: inline-flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 20px;">V</div>
            <span style="font-size: 22px; font-weight: 800; color: #0f172a; letter-spacing: -0.02em;">منصة فليوسيتي | Velocity</span>
          </div>
        </div>
        
        <h2 style="color: #0f172a; font-size: 22px; font-weight: 800; margin-bottom: 12px;">تمت دعوتك للانضمام إلى المشروع!</h2>
        
        <p style="color: #334155; font-size: 15px; line-height: 1.7; margin-bottom: 16px;">
          قام <strong>${inviterName || 'أحد أعضاء الفريق'}</strong> بدعوتك للمشاركة والعمل على مشروع <strong style="color: #4f46e5; font-size: 16px;">"${projectName}"</strong> بصلاحية <strong>${(role || 'عضو').toUpperCase()}</strong>.
        </p>
        
        ${note ? `
        <div style="background-color: #f8fafc; border-right: 4px solid #6366f1; padding: 14px 16px; margin: 20px 0; border-radius: 8px 0 0 8px; font-style: italic; color: #475569; font-size: 14px;">
          ملاحظة الدعوة: "${note}"
        </div>
        ` : ''}

        ${token ? `
        <div style="text-align: center; margin: 20px 0; padding: 16px; background-color: #f0fdf4; border-radius: 12px; border: 1px dashed #86efac;">
          <p style="margin: 0 0 6px 0; font-size: 13px; color: #166534; font-weight: bold;">رمز الانضمام السريع (Invite Code):</p>
          <span style="font-family: monospace; font-size: 20px; font-weight: 800; color: #15803d; letter-spacing: 3px; background: #ffffff; padding: 6px 16px; border-radius: 8px; border: 1px solid #bbf7d0; display: inline-block;">${token}</span>
        </div>
        ` : ''}

        <div style="margin: 28px 0; text-align: center;">
          <a href="${inviteUrl}" style="background-color: #4f46e5; color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 12px; font-weight: 700; font-size: 16px; display: inline-block; box-shadow: 0 4px 14px rgba(79, 70, 229, 0.3);">
            فتح المنصة وقبول الدعوة الآن
          </a>
        </div>

        <div dir="ltr" style="text-align: left; background-color: #f8fafc; padding: 16px; border-radius: 12px; border: 1px solid #e2e8f0; margin-top: 24px;">
          <p style="color: #334155; font-size: 13px; margin: 0 0 6px 0;"><strong>English Summary:</strong></p>
          <p style="color: #64748b; font-size: 13px; margin: 0; line-height: 1.5;">
            <strong>${inviterName || 'A team member'}</strong> invited you to collaborate on <strong>${projectName}</strong> (${role}). Click the button above or use code <code style="font-weight:bold;color:#4f46e5;">${token || ''}</code> to accept.
          </p>
        </div>

        <hr style="border: none; border-top: 1px solid #f1f5f9; margin: 28px 0;" />
        
        <p style="color: #94a3b8; font-size: 12px; line-height: 1.6; margin: 0; text-align: center;">
          إذا لم يكن لديك حساب بعد، فقط قم بتسجيل الدخول بنفس البريد <strong>${to}</strong> وستظهر لك الدعوة تلقائياً في منصتك.
        </p>
      </div>
    `;

    let emailSent = false;
    let providerUsed = '';
    let messageId: string | undefined;

    // 1. Try Resend if configured
    if (process.env.RESEND_API_KEY) {
      const resendResult = await sendViaResend(to, `دعوة انضمام لمشروع: ${projectName} | Workspace Invitation`, emailHtml);
      if (resendResult.success) {
        emailSent = true;
        providerUsed = 'resend';
        messageId = resendResult.messageId;
        console.log(`✅ Invitation email dispatched via Resend to ${to} (ID: ${messageId})`);
      } else {
        console.log(`ℹ️ Resend note for ${to}: ${resendResult.error}. Checking SMTP fallback...`);
      }
    }

    // 2. Fallback to SMTP if Resend didn't send (e.g. testing domain restriction on Resend)
    if (!emailSent) {
      const smtp = getSmtpTransporter();
      if (smtp) {
        try {
          const senderEmail = process.env.SMTP_USER;
          const info = await smtp.sendMail({
            from: `"Velocity Workspace" <${senderEmail}>`,
            to: to,
            subject: `دعوة انضمام لمشروع: ${projectName} | Workspace Invitation`,
            html: emailHtml,
          });
          emailSent = true;
          providerUsed = 'smtp';
          messageId = info.messageId;
          console.log(`✅ Invitation email dispatched via SMTP to ${to} (MessageId: ${messageId})`);
        } catch (smtpErr: any) {
          console.warn('⚠️ SMTP fallback delivery note:', smtpErr.message);
        }
      }
    }

    if (emailSent) {
      return res.json({
        success: true,
        provider: providerUsed,
        messageId,
      });
    }

    // 3. Fallback notice
    return res.json({
      success: true,
      emailSent: false,
      message: 'Invitation recorded successfully. Direct external email requires a verified domain in Resend or Gmail SMTP.',
    });
  });

  // REST API: Ping or broadcast custom project events
  app.post('/api/projects/:projectId/broadcast', (req, res) => {
    const { projectId } = req.params;
    const { type, payload } = req.body;
    if (!projectId || !type) {
      return res.status(400).json({ error: 'Missing projectId or type' });
    }
    broadcastToProject(projectId, { type, payload, projectId });
    res.json({ success: true, broadcasted: true });
  });

  // ================= CREATE HTTP & WS SERVER =================
  const server = http.createServer(app);
  const wss = new WebSocketServer({ server });

  wss.on('connection', (ws: ExtendedWebSocket) => {
    ws.isAlive = true;
    clients.add(ws);

    ws.on('pong', () => {
      ws.isAlive = true;
    });

    ws.on('message', (raw) => {
      try {
        const message = JSON.parse(raw.toString());

        if (message.type === 'auth') {
          ws.userId = message.userId;
          if (ws.projectId) {
            broadcastPresence(ws.projectId);
          }
        } else if (message.type === 'join_project') {
          const prevProjectId = ws.projectId;
          ws.projectId = message.projectId;
          if (message.userId) ws.userId = message.userId;

          if (prevProjectId && prevProjectId !== message.projectId) {
            broadcastPresence(prevProjectId);
          }
          broadcastPresence(message.projectId);
        } else if (message.type === 'leave_project') {
          const oldPid = ws.projectId;
          ws.projectId = undefined;
          if (oldPid) broadcastPresence(oldPid);
        } else if (message.type === 'user:typing') {
          if (ws.projectId) {
            broadcastToProject(ws.projectId, {
              type: 'user:typing',
              payload: message.payload,
              projectId: ws.projectId,
            }, ws);
          }
        } else if (message.type === 'activity:log') {
          if (ws.projectId) {
            broadcastToProject(ws.projectId, {
              type: 'activity:log',
              payload: message.payload,
              projectId: ws.projectId,
            }, ws);
          }
        } else if (message.type === 'activity:clear') {
          if (ws.projectId) {
            broadcastToProject(ws.projectId, {
              type: 'activity:clear',
              payload: message.payload,
              projectId: ws.projectId,
            }, ws);
          }
        }
      } catch (err) {
        console.error('Error handling WS message:', err);
      }
    });

    ws.on('close', () => {
      clients.delete(ws);
      if (ws.projectId) {
        broadcastPresence(ws.projectId);
      }
    });
  });

  const interval = setInterval(() => {
    for (const ws of clients) {
      if (ws.isAlive === false) {
        clients.delete(ws);
        if (ws.projectId) broadcastPresence(ws.projectId);
        ws.terminate();
        continue;
      }
      ws.isAlive = false;
      ws.ping();
    }
  }, 30000);

  wss.on('close', () => {
    clearInterval(interval);
  });

  // ================= VITE MIDDLEWARE =================
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server & WebSockets running at http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
