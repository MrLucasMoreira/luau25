
require('dotenv').config(); // Lembre-se de criar o arquivo .env com suas senhas!
const express = require('express');
const cors = require('cors');
const nodemailer = require("nodemailer");
const qrcode = require("qrcode");
const fs = require("fs");
const path = require("path");
const axios = require('axios');

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
            html:`
                <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #0c0a1f; color: #f0f0f0; padding: 20px; background-image: url('https://i.imgur.com/r3y5nF5.jpg'); background-size: cover; background-position: center;">
                    <div style="max-width: 600px; margin: auto; background-color: rgba(29, 26, 57, 0.9); border: 1px solid #9f5dff; border-radius: 15px; overflow: hidden; box-shadow: 0 0 25px rgba(159, 93, 255, 0.5);">
                        
                        <div style="padding: 30px; text-align: center;">
                            <img src="logoSDB.png" alt="Logo da Missão" style="width: 100px; margin-bottom: 20px;">
                            
                            <h1 style="font-size: 28px; color: #ffffff; margin: 0;">EMBARQUE AUTORIZADO</h1>
                            <p style="font-size: 18px; color: #9f5dff; font-weight: bold; margin-top: 5px;">DESTINO: SAMARIA</p>
                            
                            <hr style="border: none; border-top: 1px solid #9f5dff; margin: 25px 0;">
                            
                            <p style="font-size: 16px; text-align: left; line-height: 1.6;">
                                Saudações, Tripulante <strong>${nome}</strong>!
                            </p>
                            <p style="font-size: 16px; text-align: left; line-height: 1.6;">
                                A Central de Comando do Luau Jovens em Canção confirma: seu lugar na nave com destino a <strong>Samaria</strong> está <strong style="color: #5dff9e; text-transform: uppercase;">GARANTIDO</strong>! Você respondeu ao chamado para uma jornada de fé, louvor e reencontro.
                            </p>
                            
                            <div style="background-color: rgba(12, 10, 31, 0.8); border-radius: 10px; padding: 20px; margin: 30px 0;">
                                <h2 style="font-size: 20px; color: #f04a8b; margin-top: 0; margin-bottom: 15px; text-transform: uppercase;">Sua Credencial de Tripulante</h2>
                                <p style="margin: 0; font-size: 14px; color: #c0bacc;">Apresente esta credencial na plataforma de lançamento (check-in do evento). Ela é sua chave de acesso à nave.</p>
                                <img src="cid:qrcode-ingresso" alt="QR Code de Acesso" style="max-width: 180px; margin-top: 20px; border: 5px solid #ffffff; border-radius: 10px;">
                            </div>
                            
                            <p style="font-size: 16px; text-align: left; line-height: 1.6;">
                                Guarde este e-mail como um documento de viagem interestellar. Ele contém informações vitais para a sua jornada.
                            </p>
                            
                            <div style="text-align: left; border-left: 3px solid #f04a8b; padding-left: 15px; margin-top: 30px;">
                                <h3 style="color: #ffffff; margin: 0 0 10px 0;">Coordenadas da Missão:</h3>
                                <p style="margin: 5px 0;"><strong>Local:</strong> -20.854855867737655, -48.74487042018568 (Sítio São Jerônimo)</p>
                                <p style="margin: 5px 0;"><strong>Data:</strong> 20 & 21 de Setembro</p>
                                <p style="margin: 5px 0;"><strong>Horário:</strong>18H30</p>
                            </div>
                            
                            <p style="font-size: 18px; color: #ffffff; font-weight: bold; margin-top: 40px;">
                                Prepare-se para uma experiência que vai além da atmosfera e do sistema solar.
                            </p>
                            <p style="font-size: 16px; color: #9f5dff;">
                                Nos vemos em breve, tripulante!
                            </p>
                        </div>
                        
                        <div style="background-color: #0c0a1f; padding: 15px; text-align: center; font-size: 12px; color: #7a759a;">
                            Central de Comando | Luau Jovens em Canção &copy; 2025
                        </div>
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

app.post('/verificar-pagamento', async (req, res) => {
    // Pega os parâmetros que a checkpag.html vai enviar
    const { transaction_id, order_nsu, slug } = req.body;
    const handle = 'lucasferreira07'; // Seu handle da InfinitePay

    if (!transaction_id || !slug) {
        return res.status(400).json({ success: false, message: 'Dados de transação ausentes.' });
    }

    const urlVerificacao = `https://api.infinitepay.io/invoices/public/checkout/payment_check/${handle}`;

    try {
        console.log("--- INICIANDO VERIFICAÇÃO ---");
        console.log("Handle:", handle);
        console.log("URL de Verificação:", urlVerificacao);
        console.log("DADOS ENVIADOS NO CORPO (PAYLOAD):", {
            transaction_nsu: transaction_id,
            external_order_nsu: order_nsu,
            slug: slug
        });

        console.log(`Verificando pagamento: ${transaction_id}`);
        const response = await axios.post(urlVerificacao, {
            transaction_nsu: transaction_id, // Conforme a doc, transaction_id é o mesmo que transaction_nsu
            external_order_nsu: order_nsu,
            slug: slug
        });

        const dadosPagamento = response.data;
        console.log("Resposta da API InfinitePay:", dadosPagamento); // { success: true, paid: true }

        // Retorna a resposta da InfinitePay para a página checkpag.html
        res.status(200).json(dadosPagamento);

    } catch (error) {
        console.error("Erro ao verificar pagamento na InfinitePay:", error.response ? error.response.data : error.message);
        res.status(500).json({ success: false, paid: false, message: 'Erro ao comunicar com a API de pagamento.' });
    }
});


app.listen(port, () => {
    console.log(`Servidor rodando na porta ${port}`);
});