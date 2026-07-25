// ============================================================
// utils.js – Funções utilitárias globais
// ============================================================

function aguardarBanco() {
    return new Promise((resolve) => {
        if (typeof db !== 'undefined') {
            resolve();
            return;
        }
        const interval = setInterval(() => {
            if (typeof db !== 'undefined') {
                clearInterval(interval);
                resolve();
            }
        }, 200);
    });
}

function notificar(mensagem, tipo = 'sucesso') {
    const notifUser = document.getElementById('notificacao-user');
    const notifAdmin = document.getElementById('notificacao');
    const notif = notifUser || notifAdmin;
    if (!notif) {
        console.warn('Elemento de notificação não encontrado.');
        return;
    }
    notif.textContent = mensagem;
    const baseClass = notifUser ? 'notificacao-user' : 'notificacao';
    notif.className = baseClass + (tipo === 'erro' ? ' erro' : '');
    notif.style.display = 'block';
    setTimeout(() => {
        notif.style.display = 'none';
    }, 4000);
}

function mascararCPF(input) {
    let cpf = input.value.replace(/\D/g, '');
    if (cpf.length > 11) cpf = cpf.substring(0, 11);
    let formatado = cpf;
    if (cpf.length > 3) formatado = cpf.substring(0, 3) + '.' + cpf.substring(3);
    if (cpf.length > 6) formatado = formatado.substring(0, 7) + '.' + cpf.substring(6);
    if (cpf.length > 9) formatado = formatado.substring(0, 11) + '-' + cpf.substring(9);
    input.value = formatado;
}

function toggleSenha(inputId, botao) {
    const input = document.getElementById(inputId);
    if (!input) return;
    if (input.type === 'password') {
        input.type = 'text';
        botao.textContent = '🙈';
    } else {
        input.type = 'password';
        botao.textContent = '👁️';
    }
}

function validarCPF(cpf) {
    cpf = cpf.replace(/\D/g, '');
    if (cpf.length !== 11) return false;
    if (/^(\d)\1{10}$/.test(cpf)) return false;

    let soma = 0;
    for (let i = 0; i < 9; i++) {
        soma += parseInt(cpf.charAt(i)) * (10 - i);
    }
    let resto = soma % 11;
    let digito1 = resto < 2 ? 0 : 11 - resto;
    if (digito1 !== parseInt(cpf.charAt(9))) return false;

    soma = 0;
    for (let i = 0; i < 10; i++) {
        soma += parseInt(cpf.charAt(i)) * (11 - i);
    }
    resto = soma % 11;
    let digito2 = resto < 2 ? 0 : 11 - resto;
    if (digito2 !== parseInt(cpf.charAt(10))) return false;

    return true;
}

/**
 * Converte string de data (ISO yyyy-mm-dd ou brasileiro dd/mm/aaaa) para objeto Date.
 * Retorna null se a data for inválida.
 */
function parseData(str) {
    if (!str) return null;
    if (str.includes('-') && str.length === 10) {
        const d = new Date(str + 'T00:00:00');
        return isNaN(d) ? null : d;
    }
    if (str.includes('/')) {
        const partes = str.split('/');
        if (partes.length === 3) {
            const d = new Date(partes[2], partes[1] - 1, partes[0]);
            return isNaN(d) ? null : d;
        }
    }
    return null;
}

/**
 * Exibe modal de multa com créditos da equipe.
 * @param {number} diasAtraso
 * @param {number} multa
 * @returns {Promise<boolean>} true se confirmado, false se cancelado
 */
function exibirModalMulta(diasAtraso, multa) {
    return new Promise((resolve) => {
        // Remove modal anterior se existir
        const existente = document.getElementById('modal-multa');
        if (existente) existente.remove();

        // Cria o container do modal com fundo levemente borrado
        const modal = document.createElement('div');
        modal.id = 'modal-multa';
        modal.style.cssText = `
            position: fixed; 
            inset: 0; 
            background: rgba(15, 23, 42, 0.6); 
            backdrop-filter: blur(4px); 
            display: flex; 
            align-items: center; 
            justify-content: center; 
            z-index: 9999;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        `;

        // Função interna para renderizar a primeira tela (Aviso de Multa)
        const renderizarTelaMulta = () => {
            modal.innerHTML = `
                <div style="background: #ffffff; padding: 32px; border-radius: 16px; max-width: 400px; width: 90%; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04); text-align: center;">
                    <div style="background: #fef2f2; width: 56px; height: 56px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 16px;">
                        <span style="font-size: 24px; color: #ef4444;">⚠️</span>
                    </div>
                    <h3 style="margin: 0 0 8px 0; color: #1e293b; font-size: 20px; font-weight: 700;">Devolução com Atraso</h3>
                    <p style="margin: 0 0 24px 0; color: #64748b; font-size: 14px;">Identificamos pendências no prazo de entrega deste item.</p>
                    
                    <div style="background: #f8fafc; border-radius: 12px; padding: 16px; margin-bottom: 24px; text-align: left; border: 1px solid #e2e8f0;">
                        <div style="display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 14px; color: #475569;">
                            <span>Tempo de atraso:</span>
                            <span style="font-weight: 600; color: #1e293b;">${diasAtraso} dia(s)</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; font-size: 14px; color: #475569; align-items: center;">
                            <span>Valor da multa:</span>
                            <span style="font-size: 18px; font-weight: 700; color: #ef4444;">R$ ${multa.toFixed(2)}</span>
                        </div>
                    </div>

                    <div style="display: flex; gap: 12px;">
                        <button id="btn-cancelar" style="flex: 1; padding: 12px; background: #f1f5f9; color: #475569; border: none; border-radius: 10px; font-weight: 600; font-size: 14px; cursor: pointer; transition: background 0.2s;">Cancelar</button>
                        <button id="btn-pagar" style="flex: 1; padding: 12px; background: #3b82f6; color: #ffffff; border: none; border-radius: 10px; font-weight: 600; font-size: 14px; cursor: pointer; transition: background 0.2s;">Pagar Multa</button>
                    </div>
                </div>
            `;

            // Eventos da primeira tela
            document.getElementById('btn-cancelar').onclick = () => { modal.remove(); resolve(false); };
            document.getElementById('btn-pagar').onclick = renderizarTelaCreditos;
            
            // Efeitos de Hover básicos via JS
             configurarBotaoHover('btn-pagar', '#3b82f6', '#2563eb');
             configurarBotaoHover('btn-cancelar', '#f1f5f9', '#e2e8f0');
        };

        // Função interna para renderizar a segunda tela (Créditos da Equipe)
        const renderizarTelaCreditos = () => {
            modal.innerHTML = `
                <div style="background: #ffffff; padding: 32px; border-radius: 16px; max-width: 420px; width: 90%; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04); text-align: center;">
                    <div style="background: #eff6ff; width: 56px; height: 56px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 16px;">
                        <span style="font-size: 24px; color: #3b82f6;">👨‍💻</span>
                    </div>
                    <h3 style="margin: 0 0 4px 0; color: #1e293b; font-size: 20px; font-weight: 700;">Equipe de Desenvolvimento</h3>
                    <p style="margin: 0 0 24px 0; color: #64748b; font-size: 14px;">Sistema desenvolvido com orgulho por:</p>
                    
                    <div style="display: flex; flex-direction: column; gap: 12px; margin-bottom: 28px; text-align: left;">
                        ${renderizarLinhaDev('Gustavo Pelepe', 'Guspelepe')}
                        ${renderizarLinhaDev('Ronaldo Karas', 'ronaldokaras')}
                        ${renderizarLinhaDev('Douglas Becker', 'douglasbecker404')}
                    </div>

                    <div style="display: flex; flex-direction: column; gap: 10px;">
                        <button id="btn-confirmar-devolucao" style="width: 100%; padding: 12px; background: #10b981; color: #ffffff; border: none; border-radius: 10px; font-weight: 600; font-size: 14px; cursor: pointer; transition: background 0.2s;">Confirmar e Concluir Devolução</button>
                        <button id="btn-voltar" style="width: 100%; padding: 10px; background: transparent; color: #64748b; border: 1px solid #e2e8f0; border-radius: 10px; font-weight: 500; font-size: 14px; cursor: pointer; transition: all 0.2s;">Voltar para o valor</button>
                    </div>
                </div>
            `;

            // Eventos da segunda tela
            document.getElementById('btn-confirmar-devolucao').onclick = () => { modal.remove(); resolve(true); };
            document.getElementById('btn-voltar').onclick = renderizarTelaMulta; // Agora ele volta de verdade para a tela anterior
            
             configurarBotaoHover('btn-confirmar-devolucao', '#10b981', '#059669');
             configurarBotaoHover('btn-voltar', 'transparent', '#f8fafc');
        };

        // Helper para gerar as linhas dos desenvolvedores de forma elegante
        const renderizarLinhaDev = (nome, github) => `
            <div style="display: flex; align-items: center; justify-content: space-between; padding: 10px 14px; background: #f8fafc; border-radius: 10px; border: 1px solid #f1f5f9;">
                <span style="font-weight: 500; color: #334155; font-size: 14px;">${nome}</span>
                <a href="https://github.com/${github}" target="_blank" style="display: inline-flex; align-items: center; gap: 6px; color: #3b82f6; text-decoration: none; font-size: 13px; font-weight: 600;">
                    @${github}
                    <span style="font-size: 11px;">↗</span>
                </a>
            </div>
        `;

        // Helper simples para dar feedback visual ao passar o mouse nos botões
        const configurarBotaoHover = (id, corBase, corHover) => {
            const btn = document.getElementById(id);
            if (!btn) return;
            btn.onmouseenter = () => btn.style.background = corHover;
            btn.onmouseleave = () => btn.style.background = corBase;
        };

        // Inicia exibindo a tela principal de multa
        document.body.appendChild(modal);
        renderizarTelaMulta();
    });
}

/**
 * Exibe modal de confirmação de devolução normal (Sem atraso / Sem multa).
 * @returns {Promise<boolean>} true se confirmado, false se cancelado
 */
function exibirModalDevolucaoNormal() {
    return new Promise((resolve) => {
        // Remove modal anterior se existir para evitar duplicidade
        const existente = document.getElementById('modal-devolucao-normal');
        if (existente) existente.remove();

        // Cria o container do modal com fundo borrado
        const modal = document.createElement('div');
        modal.id = 'modal-devolucao-normal';
        modal.style.cssText = `
            position: fixed; 
            inset: 0; 
            background: rgba(15, 23, 42, 0.6); 
            backdrop-filter: blur(4px); 
            display: flex; 
            align-items: center; 
            justify-content: center; 
            z-index: 9999;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        `;

        // Função interna para renderizar a tela de confirmação
        const renderizarTelaConfirmacao = () => {
            modal.innerHTML = `
                <div style="background: #ffffff; padding: 32px; border-radius: 16px; max-width: 400px; width: 90%; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04); text-align: center;">
                    <div style="background: #ecfdf5; width: 56px; height: 56px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 16px;">
                        <span style="font-size: 24px; color: #10b981;">✅</span>
                    </div>
                    <h3 style="margin: 0 0 8px 0; color: #1e293b; font-size: 20px; font-weight: 700;">Confirmar Devolução</h3>
                    <p style="margin: 0 0 24px 0; color: #64748b; font-size: 14px;">O item está dentro do prazo regulamentar. Não há multas ou taxas adicionais a serem aplicadas.</p>
                    
                    <div style="background: #f8fafc; border-radius: 12px; padding: 16px; margin-bottom: 24px; text-align: left; border: 1px solid #e2e8f0;">
                        <div style="display: flex; justify-content: space-between; font-size: 14px; color: #475569;">
                            <span>Situação do prazo:</span>
                            <span style="font-weight: 600; color: #10b981;">Regular / Em dia</span>
                        </div>
                    </div>

                    <div style="display: flex; gap: 12px;">
                        <button id="btn-normal-cancelar" style="flex: 1; padding: 12px; background: #f1f5f9; color: #475569; border: none; border-radius: 10px; font-weight: 600; font-size: 14px; cursor: pointer; transition: background 0.2s;">Voltar</button>
                        <button id="btn-normal-avancar" style="flex: 1; padding: 12px; background: #10b981; color: #ffffff; border: none; border-radius: 10px; font-weight: 600; font-size: 14px; cursor: pointer; transition: background 0.2s;">Avançar</button>
                    </div>
                </div>
            `;

            // Configura os cliques dos botões
            document.getElementById('btn-normal-cancelar').onclick = () => { modal.remove(); resolve(false); };
            document.getElementById('btn-normal-avancar').onclick = renderizarTelaCreditosNormal;
            
            // Efeitos de Hover
            configurarHover('btn-normal-avancar', '#10b981', '#059669');
            configurarHover('btn-normal-cancelar', '#f1f5f9', '#e2e8f0');
        };

        // Função interna para renderizar a tela de créditos antes de fechar de vez
        const renderizarTelaCreditosNormal = () => {
            modal.innerHTML = `
                <div style="background: #ffffff; padding: 32px; border-radius: 16px; max-width: 420px; width: 90%; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04); text-align: center;">
                    <div style="background: #eff6ff; width: 56px; height: 56px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 16px;">
                        <span style="font-size: 24px; color: #3b82f6;">👨‍💻</span>
                    </div>
                    <h3 style="margin: 0 0 4px 0; color: #1e293b; font-size: 20px; font-weight: 700;">Equipe de Desenvolvimento</h3>
                    <p style="margin: 0 0 24px 0; color: #64748b; font-size: 14px;">Sistema desenvolvido com orgulho por:</p>
                    
                    <div style="display: flex; flex-direction: column; gap: 12px; margin-bottom: 28px; text-align: left;">
                        ${renderizarLinhaDevNormal('Gustavo Pelepe', 'Guspelepe')}
                        ${renderizarLinhaDevNormal('Ronaldo Karas', 'ronaldokaras')}
                        ${renderizarLinhaDevNormal('Douglas Becker', 'douglasbecker404')}
                    </div>

                    <div style="display: flex; flex-direction: column; gap: 10px;">
                        <button id="btn-finalizar-devolucao" style="width: 100%; padding: 12px; background: #3b82f6; color: #ffffff; border: none; border-radius: 10px; font-weight: 600; font-size: 14px; cursor: pointer; transition: background 0.2s;">Concluir Devolução</button>
                        <button id="btn-normal-voltar" style="width: 100%; padding: 10px; background: transparent; color: #64748b; border: 1px solid #e2e8f0; border-radius: 10px; font-weight: 500; font-size: 14px; cursor: pointer; transition: all 0.2s;">Voltar</button>
                    </div>
                </div>
            `;

            // Configura os cliques dos botões da tela de créditos
            document.getElementById('btn-finalizar-devolucao').onclick = () => { modal.remove(); resolve(true); };
            document.getElementById('btn-normal-voltar').onclick = renderizarTelaConfirmacao;
            
            configurarHover('btn-finalizar-devolucao', '#3b82f6', '#2563eb');
            configurarHover('btn-normal-voltar', 'transparent', '#f8fafc');
        };

        // Lista de desenvolvedores
        const renderizarLinhaDevNormal = (nome, github) => `
            <div style="display: flex; align-items: center; justify-content: space-between; padding: 10px 14px; background: #f8fafc; border-radius: 10px; border: 1px solid #f1f5f9;">
                <span style="font-weight: 500; color: #334155; font-size: 14px;">${nome}</span>
                <a href="https://github.com/${github}" target="_blank" style="display: inline-flex; align-items: center; gap: 6px; color: #3b82f6; text-decoration: none; font-size: 13px; font-weight: 600;">
                    @${github}
                    <span style="font-size: 11px;">↗</span>
                </a>
            </div>
        `;

        // Utilitário para o efeito hover
        const configurarHover = (id, corBase, corHover) => {
            const btn = document.getElementById(id);
            if (!btn) return;
            btn.onmouseenter = () => btn.style.background = corHover;
            btn.onmouseleave = () => btn.style.background = corBase;
        };

        // Insere e inicia na primeira tela
        document.body.appendChild(modal);
        renderizarTelaConfirmacao();
    });
}

/**
 * Realiza logout limpando a sessão e redirecionando para index.html
 */
function logout() {
    sessionStorage.clear();
    window.location.href = 'index.html';
}

/**
 * Valida se uma URL tem extensão de imagem conhecida.
 * Retorna true se for válida, false caso contrário.
 */
function validarURLImagem(url) {
    if (!url || url.trim() === '') return false; // campo vazio é permitido (placeholder será usado)
    const extensoes = /\.(jpg|jpeg|png|gif|webp)(\?.*)?$/i;
    return extensoes.test(url.trim());
}