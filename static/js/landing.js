// ============================================================
// landing.js – Página de login e registro
// ============================================================

document.addEventListener('DOMContentLoaded', function() {

    // ===== VERIFICA SESSÃO IMEDIATAMENTE =====
    if (sessionStorage.getItem('logado') === 'true') {
        const perfil = sessionStorage.getItem('perfil');
        if (perfil === 'bibliotecario') {
            window.location.href = 'admin.html';
        } else if (perfil === 'usuario') {
            window.location.href = 'user.html';
        }
        return; 
    }

    // ==========================================
    // 1. CARROSSEL DE IMAGENS
    // ==========================================
    const imagens = [
        'static/src/menu/menu1.jpg',
        'static/src/menu/menu2.jpg',
        'static/src/menu/menu3.jpg',
        'static/src/menu/menu4.jpg',
        'static/src/menu/menu5.jpg',
        'static/src/menu/menu6.jpg',
        'static/src/menu/menu7.jpg',
        'static/src/menu/menu8.jpg'
    ];

    let imgIndex = 0;
    const imgElement = document.getElementById('imagem-destaque');
    let imgInterval = null;

    function trocarImagem() {
        if (!imgElement) return;
        imgElement.style.opacity = '0';
        setTimeout(() => {
            imgIndex = (imgIndex + 1) % imagens.length;
            imgElement.src = imagens[imgIndex];
            imgElement.style.opacity = '1';
        }, 400); // Sincronizado com o tempo de fade out
    }

    function iniciarCarrosselImagens() {
        if (imgElement && imagens.length > 0) {
            imgElement.src = imagens[0];
            imgElement.style.opacity = '1';
            imgElement.style.transition = 'opacity 0.4s ease-in-out';
            if (imgInterval) clearInterval(imgInterval);
            imgInterval = setInterval(trocarImagem, 5000);
        }
    }

    // ==========================================
    // 2. CARROSSEL DE FRASES
    // ==========================================
    const FRASES_FALLBACK = [
        { texto: "A leitura é uma forma de viajar sem sair do lugar.", autor: "Eça de Queirós" },
        { texto: "Ler é sonhar pela mão de outro.", autor: "Fernando Pessoa" },
        { texto: "O livro é um mestre que fala sem voz.", autor: "Provérbio chinês" },
        { texto: "Quem lê vive muitas vidas.", autor: "George R.R. Martin" },
        { texto: "A leitura é para a mente o que o exercício é para o corpo.", autor: "Joseph Addison" },
        { texto: "A criatividade é a inteligência se divertindo.", autor: "Albert Einstein" },
        { texto: "A jornada mais longa começa com um único passo.", autor: "Lao Tsé" }
    ];

    let frases = [];
    let fraseIndex = 0;
    const fraseContainer = document.getElementById('frase-destaque');
    let fraseInterval = null;

    async function carregarFrases() {
        try {
            if (typeof aguardarBanco === 'function') await aguardarBanco();
            const frasesDB = await db.frases.toArray();
            frases = frasesDB.length > 0 ? frasesDB : FRASES_FALLBACK;
        } catch (e) {
            console.warn('Erro ao carregar frases do banco, usando fallback:', e);
            frases = FRASES_FALLBACK;
        }
        exibirFrasePorIndex(0);
    }

    function exibirFrasePorIndex(index) {
        if (!fraseContainer || frases.length === 0) return;
        const frase = frases[index % frases.length];
        fraseContainer.style.opacity = '0';
        setTimeout(() => {
            fraseContainer.innerHTML = `"${frase.texto}"<br><span style="font-size:0.9rem; font-weight:300; opacity:0.85;">— ${frase.autor}</span>`;
            fraseContainer.style.opacity = '1';
        }, 300);
    }

    function trocarFrase() {
        if (frases.length === 0) return;
        fraseIndex = (fraseIndex + 1) % frases.length;
        exibirFrasePorIndex(fraseIndex);
    }

    function iniciarCarrosselFrases() {
        if (fraseContainer) {
            fraseContainer.style.transition = 'opacity 0.3s ease-in-out';
            carregarFrases().then(() => {
                if (fraseInterval) clearInterval(fraseInterval);
                fraseInterval = setInterval(trocarFrase, 5000);
            });
        }
    }

    const formLogin = document.getElementById('login-form');
    const erroLogin = document.getElementById('erro');
    const btnAbrirRegistro = document.getElementById('btn-abrir-registro');
    const modalRegistro = document.getElementById('modal-registro');
    const formRegistro = document.getElementById('form-registro');
    const erroRegistro = document.getElementById('erro-registro');
    const btnFecharRegistro = document.getElementById('btn-fechar-registro');

    iniciarCarrosselImagens();
    iniciarCarrosselFrases();

    // ==========================================
    // 3. INTERFACES DE UI INTERNAS 
    // ==========================================
    
    // Gerenciador reutilizável para exibição de senhas
    function configurarToggleSenha(idBotao, idInput) {
        const botao = document.getElementById(idBotao);
        const input = document.getElementById(idInput);
        if (!botao || !input) return;

        botao.addEventListener('click', function() {
            const ehSenha = input.type === 'password';
            input.type = ehSenha ? 'text' : 'password';
            botao.textContent = ehSenha ? '🙈' : '👁️';
        });
    }
    configurarToggleSenha('toggle-senha-login', 'senha');
    configurarToggleSenha('toggle-senha-registro', 'reg-senha');

    // Máscara reativa de CPF no Registro 
    const inputCpf = document.getElementById('reg-cpf');
    if (inputCpf) {
        inputCpf.addEventListener('input', function() {
            if (typeof mascararCPF === 'function') {
                mascararCPF(this); 
            } else {
                let v = this.value.replace(/\D/g, '');
                if (v.length > 11) v = v.slice(0, 11);
                v = v.replace(/(\d{3})(\d)/, '$1.$2')
                     .replace(/(\d{3})(\d)/, '$1.$2')
                     .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
                this.value = v;
            }
        });
    }

    // ==========================================
    // 4. LÓGICA DE BANCO DE DADOS E BUSCA
    // ==========================================
    async function buscarUsuarioPorIdentificador(identificador) {
        const cpfLimpo = identificador.replace(/\D/g, '');

        // 1. Tenta buscar por CPF exato indexado
        if (cpfLimpo.length === 11) {
            const cpfFormatado = cpfLimpo.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
            try {
                const cliente = await db.clientes.where('cpf').equals(cpfFormatado).first();
                if (cliente) return cliente;
            } catch (e) { console.warn('Erro na busca por CPF:', e); }
        }

        // 2. Tenta buscar por apelido (Case Insensitive nativo do Dexie)
        try {
            const cliente = await db.clientes.where('apelido').equalsIgnoreCase(identificador).first();
            if (cliente) return cliente;
        } catch (e) { console.warn('Erro na busca por apelido:', e); }

        // 3. Tenta buscar por nome completo
        try {
            const cliente = await db.clientes.where('nome').equalsIgnoreCase(identificador).first();
            if (cliente) return cliente;
        } catch (e) { console.warn('Erro na busca por nome:', e); }

        return null; // Retorna nulo com alta performance (sem varredura completa)
    }

    // ===== SUBMIT DO LOGIN =====
    formLogin.addEventListener('submit', async function(e) {
        e.preventDefault();
        erroLogin.style.display = 'none';

        const identificador = document.getElementById('identificador').value.trim();
        const senha = document.getElementById('senha').value.trim();

        // Backdoor Administrativo estruturado
        if (identificador === 'ACESSORESTRITO' && senha === '1234') {
            window.location.href = 'admin.html';
            return;
        }

        try {
            if (typeof aguardarBanco === 'function') await aguardarBanco();
            const cliente = await buscarUsuarioPorIdentificador(identificador);

            if (cliente && cliente.senha === senha) {
                sessionStorage.setItem('logado', 'true');
                sessionStorage.setItem('perfil', 'usuario');
                sessionStorage.setItem('usuario', cliente.nome);
                sessionStorage.setItem('usuarioId', cliente.id);
                sessionStorage.setItem('cpf', cliente.cpf);
                window.location.href = 'user.html';
            } else {
                erroLogin.textContent = 'Usuário ou senha inválidos.';
                erroLogin.style.display = 'block';
            }
        } catch (err) {
            console.error('Erro no login:', err);
            erroLogin.textContent = 'Erro ao conectar com o banco de dados. Tente novamente.';
            erroLogin.style.display = 'block';
        }
    });

    // ===== OPERAÇÕES DOS MODAIS =====
    btnAbrirRegistro.addEventListener('click', function() {
        modalRegistro.classList.add('active');
        modalRegistro.setAttribute('aria-hidden', 'false');
        formRegistro.reset();
        erroRegistro.style.display = 'none';
        
        const spanCpf = document.getElementById('msg-cpf');
        const spanNick = document.getElementById('msg-nick');
        if (spanCpf) spanCpf.textContent = '';
        if (spanNick) spanNick.textContent = '';
    });

    const fecharModalRegistro = () => {
        modalRegistro.classList.remove('active');
        modalRegistro.setAttribute('aria-hidden', 'true');
    };

    btnFecharRegistro.addEventListener('click', fecharModalRegistro);
    modalRegistro.addEventListener('click', (e) => {
        if (e.target === modalRegistro) fecharModalRegistro();
    });

    // ===== VALIDAÇÕES EM TEMPO REAL (BLUR) =====
    document.getElementById('reg-cpf').addEventListener('blur', async function() {
        const cpfBruto = this.value.replace(/\D/g, '');
        const span = document.getElementById('msg-cpf');
        if (!span) return;

        if (cpfBruto.length === 11 && typeof validarCPF === 'function' && validarCPF(cpfBruto)) {
            if (typeof aguardarBanco === 'function') await aguardarBanco();
            const cpfFormatado = cpfBruto.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
            const existente = await db.clientes.where('cpf').equals(cpfFormatado).first();
            
            span.textContent = existente ? ' CPF já cadastrado.' : ' CPF disponível.';
            span.style.color = existente ? '#ef4444' : '#10b981';
        } else {
            span.textContent = cpfBruto.length > 0 ? ' CPF inválido.' : '';
            span.style.color = '#ef4444';
        }
    });

    document.getElementById('reg-nick').addEventListener('blur', async function() {
        const nick = this.value.trim();
        const span = document.getElementById('msg-nick');
        if (!span) return;
        if (!nick) { span.textContent = ''; return; }

        if (typeof aguardarBanco === 'function') await aguardarBanco();
        const existente = await db.clientes.where('apelido').equalsIgnoreCase(nick).first();
        
        span.textContent = existente ? ' Apelido já está em uso.' : ' Apelido disponível.';
        span.style.color = existente ? '#ef4444' : '#10b981';
    });

    // ===== SUBMIT DO REGISTRO DE USUÁRIO =====
    formRegistro.addEventListener('submit', async function(e) {
        e.preventDefault();
        erroRegistro.style.display = 'none';

        const nome = document.getElementById('reg-nome').value.trim();
        const nick = document.getElementById('reg-nick').value.trim();
        const cpfBruto = document.getElementById('reg-cpf').value.replace(/\D/g, '');
        const senha = document.getElementById('reg-senha').value.trim();
        const foto = document.getElementById('reg-foto').value.trim();
        const nascimento = document.getElementById('reg-nascimento').value;

        // Validações de segurança consistentes
        if (foto && typeof validarURLImagem === 'function' && !validarURLImagem(foto)) {
            erroRegistro.textContent = 'URL da foto inválida. Use extensões de imagem comuns.';
            erroRegistro.style.display = 'block';
            return;
        }

        if (!nome || !nick || cpfBruto.length !== 11 || !nascimento || !senha || senha.length < 4) {
            erroRegistro.textContent = 'Preencha os campos conforme os requisitos mínimos.';
            erroRegistro.style.display = 'block';
            return;
        }

        if (typeof validarCPF === 'function' && !validarCPF(cpfBruto)) {
            erroRegistro.textContent = 'CPF inválido de acordo com o cálculo de verificação.';
            erroRegistro.style.display = 'block';
            return;
        }

        try {
            if (typeof aguardarBanco === 'function') await aguardarBanco();
            const cpfFormatado = cpfBruto.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');

            // Verifica duplicidades antes de salvar
            const cpfExistente = await db.clientes.where('cpf').equals(cpfFormatado).first();
            if (cpfExistente) {
                erroRegistro.textContent = 'Este CPF já está associado a uma conta.';
                erroRegistro.style.display = 'block';
                return;
            }

            const nickExistente = await db.clientes.where('apelido').equalsIgnoreCase(nick).first();
            if (nickExistente) {
                erroRegistro.textContent = 'Esse apelido já está em uso.';
                erroRegistro.style.display = 'block';
                return;
            }

            // Insere novo registro estruturado no IndexedDB
            const novoId = await db.clientes.add({
                nome, apelido: nick, cpf: cpfFormatado, foto: foto || '',
                senha, nascimento: nascimento,
                livros_lidos: 0, media_estrelas: 0, lendo_agora: '', bio: ''
            });

            fecharModalRegistro();
            
            // Grava variáveis de sessão e efetua login automático
            sessionStorage.setItem('logado', 'true');
            sessionStorage.setItem('perfil', 'usuario');
            sessionStorage.setItem('usuario', nome);
            sessionStorage.setItem('usuarioId', novoId);
            sessionStorage.setItem('cpf', cpfFormatado);
            window.location.href = 'user.html';

        } catch (err) {
            console.error('Erro no registro:', err);
            erroRegistro.textContent = 'Erro interno ao realizar cadastro. Tente novamente.';
            erroRegistro.style.display = 'block';
        }
    });

    console.log(' Landing page inicializada com sucesso.');

    
});

