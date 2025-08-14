
require('dotenv').config(); // Lembre-se de criar o arquivo .env com suas senhas!
const express = require('express');
const cors = require('cors');
const nodemailer = require("nodemailer");
const qrcode = require("qrcode");
const fs = require("fs");
const path = require("path");

const app = express();
const port = process.env.PORT || 10000;

// Middlewares
app.use(cors()); // Permite requisições de outros domínios (seu site)
app.use(express.json()); // Permite que o servidor entenda JSON no corpo das requisições

// Configuração do Nodemailer (seu e-mail da Hostinger)
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.hostinger.com",
    port: parseInt(process.env.SMTP_PORT || "465", 10),
    secure: true, // Hostinger usa porta 465 com SSL
    auth: {
        user: process.env.SMTP_USER, // Ex: 'contato@seusite.com'
        pass: process.env.SMTP_PASS, // A senha do seu e-mail
    },
});

// Rota principal para verificar se o servidor está no ar
app.get('/', (req, res) => {
    res.send('Servidor de E-mail para o Luau Jovens em Canção está rodando!');
});

// --- NOSSA NOVA ROTA MÁGICA ---
app.post('/enviar-confirmacao', async (req, res) => {
    // 1. Pega os dados que a página checkpag.html vai nos enviar
    const { nome, email, cpf } = req.body;

    // 2. Validação simples para garantir que recebemos os dados
    if (!nome || !email || !cpf) {
        console.error("Dados incompletos recebidos:", req.body);
        return res.status(400).json({ success: false, message: 'Dados incompletos: Nome, e-mail e CPF são obrigatórios.' });
    }

    try {
        console.log(`Recebida solicitação para enviar e-mail para ${email} (CPF: ${cpf})`);
        // 3. Chama a função que você já criou para enviar o e-mail
        await enviarEmailComQRCode(email, cpf, nome);
        console.log(`E-mail de confirmação enviado com sucesso para ${email}.`);
        res.status(200).json({ success: true, message: 'E-mail de confirmação enviado com sucesso!' });
    } catch (error) {
        console.error(`Erro ao tentar enviar e-mail para ${email}:`, error);
        res.status(500).json({ success: false, message: 'Ocorreu um erro interno ao enviar o e-mail.' });
    }
});

// --- SUA FUNÇÃO DE E-MAIL, SÓ ADICIONEI O PARÂMETRO "NOME" ---
async function enviarEmailComQRCode(destinatario, cpf, nome) {
    const qrFilePath = path.join(__dirname, `qrcode-${cpf}.png`); // Usa path.join para compatibilidade

    try {
        // Gera o QR Code com o CPF do inscrito
        await qrcode.toFile(qrFilePath, cpf);

        // Monta o corpo do e-mail
        const mailOptions = {
            from: `"${process.env.EMAIL_NAME || 'Luau Jovens em Canção'}" <${process.env.SMTP_USER}>`,
            to: destinatario,
            subject: "✅ Inscrição Confirmada! Seu ingresso para o Luau está aqui!",
            // Template HTML personalizado com o nome do participante
            html: `
                <div style="font-family: Arial, sans-serif; text-align: center; padding: 20px; background-color: #f4f4f4;">
                    <div style="max-width: 600px; background-color: #ffffff; padding: 30px; margin: auto; border-radius: 10px; box-shadow: 0 4px 10px rgba(0,0,0,0.1);">
                        <h2 style="color: #0d6efd;">Olá, ${nome}!</h2>
                        <p style="font-size: 18px; color: #333;">
                            É com muita alegria que confirmamos sua inscrição para o <strong>Luau Jovens em Canção</strong>! 🎉
                        </p>
                        <p style="font-size: 16px; color: #555;">
                            Sua decolagem nesta missão de fé e música está garantida!
                        </p>
                        <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
                        <p style="font-size: 16px; color: #333;">
                            Este é o seu <strong>Ingresso Digital</strong>. Apresente este QR Code na entrada do evento:
                        </p>
                        <div style="margin: 25px 0;">
                            <img src="cid:qrcode-ingresso" alt="QR Code de Inscrição" style="max-width: 200px; border-radius: 8px;">
                        </div>
                        <p style="font-size: 14px; color: #777;">
                            (Este QR Code é único e contém sua identificação)
                        </p>
                        <p style="font-size: 16px; color: #0d6efd; font-weight: bold; margin-top: 20px;">
                            Nos vemos sob as estrelas! Deus te abençoe! 🙏✨
                        </p>
                    </div>
                </div>
            `,
            attachments: [{
                filename: 'qrcode.png',
                path: qrFilePath,
                cid: 'qrcode-ingresso' // ID de conteúdo para usar no HTML
            }]
        };

        // Envia o e-mail
        await transporter.sendMail(mailOptions);

    } catch (error) {
        // Garante que o erro seja propagado para a rota poder tratá-lo
        console.error("Erro na função enviarEmailComQRCode:", error);
        throw error;
    } finally {
        // Limpa o arquivo de QR Code gerado, mesmo se houver um erro
        if (fs.existsSync(qrFilePath)) {
            fs.unlinkSync(qrFilePath);
        }
    }
}


app.listen(port, () => {
    console.log(`Servidor rodando na porta ${port}`);
});