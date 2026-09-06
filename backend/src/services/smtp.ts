import nodemailer from 'nodemailer';
import { prisma } from './db';

const transporterMap: Map<string, nodemailer.Transporter> = new Map();

export interface EmailAttachmentInput {
  filename: string;
  contentType?: string;
  size?: number;
  data: string; // base64 payload
}

export async function getOrCreateTransporter(senderEmail: string) {
  if (transporterMap.has(senderEmail)) {
    return transporterMap.get(senderEmail)!;
  }

  let senderAccount = await prisma.senderAccount.findUnique({
    where: { email: senderEmail },
  });

  if (!senderAccount || !senderAccount.etherealUser || !senderAccount.etherealPass) {
    console.log(`✉️ Creating new Ethereal SMTP test account for sender: ${senderEmail}...`);
    const testAccount = await nodemailer.createTestAccount();
    
    senderAccount = await prisma.senderAccount.upsert({
      where: { email: senderEmail },
      update: {
        etherealUser: testAccount.user,
        etherealPass: testAccount.pass,
      },
      create: {
        email: senderEmail,
        name: senderEmail.split('@')[0],
        etherealUser: testAccount.user,
        etherealPass: testAccount.pass,
        hourlyLimit: 100,
      },
    });
  }

  const transporter = nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    secure: false,
    auth: {
      user: senderAccount.etherealUser!,
      pass: senderAccount.etherealPass!,
    },
  });

  transporterMap.set(senderEmail, transporter);
  return transporter;
}

export async function sendEmailViaEthereal(params: {
  senderEmail: string;
  recipient: string;
  subject: string;
  body: string;
  attachments?: EmailAttachmentInput[];
}) {
  const transporter = await getOrCreateTransporter(params.senderEmail);

  const formattedAttachments = params.attachments?.map((att) => ({
    filename: att.filename,
    content: Buffer.from(att.data, 'base64'),
    contentType: att.contentType,
  }));

  const info = await transporter.sendMail({
    from: `"${params.senderEmail.split('@')[0]}" <${params.senderEmail}>`,
    to: params.recipient,
    subject: params.subject,
    text: params.body.replace(/<[^>]*>?/gm, ''), // plain text fallback
    html: params.body.includes('<') ? params.body : `<div style="font-family: sans-serif; padding: 20px; line-height: 1.6;">${params.body.replace(/\n/g, '<br/>')}</div>`,
    attachments: formattedAttachments,
  });

  const previewUrl = nodemailer.getTestMessageUrl(info);
  return {
    messageId: info.messageId,
    previewUrl: previewUrl || undefined,
  };
}
