# ✨ SKYLOUNGE — Experiência Social Multiplayer 3D & Cinema na Web

**SkyLounge** é uma cobertura panorâmica social multiplayer 3D acessível diretamente pelo navegador, projetada com estética *stylized premium*, movimentação em 3ª pessoa estilo Roblox (com câmera orbital via **Segurar Botão Direito / Hold**), avatares 3D expressivos e personalizáveis, sistema interativo de assentos e um **Cinema Social 3D Gigante** integrado fisicamente ao cenário tridimensional.

---

## 🏗️ Arquitetura e Destaques Técnicos

### 1. Integração Real do Player de Vídeo ao Mundo 3D (`CSS3DRenderer` + Hardware Depth Hole-Punch)
Para garantir que vídeos e transmissões ao vivo (**YouTube**, **YouTube Live**, **Twitch** e **Kick**) respeitem 100% a perspectiva, rotação, campo de visão e **oclusão tridimensional pixel a pixel** (sem jamais se sobrepor indevidamente a personagens, sofás, paredes ou HUD):
- **Camada CSS3D (`z-index: 1`)**: Posicionada imediatamente atrás do `<canvas>` WebGL, sincronizada no mesmo *frame* (`useFrame`) com a matriz de projeção e visão da câmera Three.js (`CSS3DRenderer` + `CSS3DObject`).
- **WebGL Hardware Depth-Buffer Hole-Punch (`z-index: 2`)**: A superfície física da tela da TV (`8.8m × 4.95m`, proporção 16:9) é renderizada no passe opaco inicial (`renderOrder = -10`) utilizando `THREE.NoBlending`, `opacity: 0`, `side: THREE.FrontSide`, `depthWrite: true` e `depthTest: true`.
  - Isso grava `RGBA = (0, 0, 0, 0)` (uma janela transparente no `<canvas>`) e registra a profundidade exata `Z_tv` no *depth buffer* de hardware da GPU.
  - Qualquer geometria **atrás** da TV (`Z > Z_tv`, como o gabinete traseiro da TV, paredes e prédios) é descartada pelo *depth test* nos pixels da tela.
  - Qualquer geometria **à frente** da TV (`Z < Z_tv`, como avatares caminhando na frente da tela, sofás, pilares, plantas ou paredes) passa no *depth test* e sobrescreve o `<canvas>` com `alpha = 1.0`, ocluindo o vídeo com precisão de sub-pixel.
  - Ao passar para trás da TV (`side: THREE.FrontSide`) ou olhar para a parede oposta (*frustum check*), nenhum furo é aberto e o elemento DOM é ocultado imediatamente.

### 2. Cenário Urbano 3D & Cobertura Panorâmica (`SkyPenthouse.tsx` & `CitySkyline.tsx`)
- **Paredes de Vidro do Chão ao Teto**: Mais de 270° de painéis de vidro panorâmico com montantes metálicos em bronze escuro anodizado.
- **Horizonte Urbano 3D em Crepúsculo/Noite**: Dezenas de arranha-céus 3D com recuos arquitetônicos (*setbacks*), janelas iluminadas irregularmente em tons quentes e frios, helipontos, antenas com luzes vermelhas de aviação pulsantes (`InstancedMesh`), letreiros neon e avenidas profundas (`y = -85m`) com tráfego animado.
- **Level Design Funcional**:
  - *Grand Social Cinema Pit*: Sofá modular em veludo, chaises laterais, pufes, almofadas de chão, mesa de centro em mármore travertino e plataforma VIP elevada (`+0.20m`).
  - *East Mezzanine Mixology Bar*: Mezanino elevado (`+1.20m`) com escada iluminada, guarda-corpo de vidro, bancada de mármore, banquetas interativas e prateleiras retroiluminadas com garrafas decorativas.
  - *West Sunset Reading Nook*: Poltronas de design, sofá mirante, estante de livros 3D, luminárias de piso e plantas tropicais modeladas em 3D.

### 3. Avatares 3D Estilizados & Personalização (`StylizedAvatar.tsx`)
- Modelos 3D articulados construídos com geometria suavizada, cabeças expressivas, olhos com brilho especular e piscar natural, sobrancelhas, blush, 5 estilos de cabelo 3D (`spiky`, `bob`, `curly`, `ponytail`, `waves`), 4 estilos de roupa (`jacket`, `hoodie`, `blazer`, `vest`) e acessórios (`glasses`, `headphones`, `crown`, `beanie`).
- Animações suaves interpoladas com `THREE.MathUtils.damp`: `idle`, `walk`, `run`, `jump`, `sit`, `wave`, `dance`, `cheer` e `laugh`.

### 4. Multiplayer Autoritativo em Tempo Real (`server/index.ts`)
- Servidor **Node.js + Express + Socket.IO** servindo frontend e WebSockets na mesma origem.
- Gerenciamento autoritativo de salas (`SKY-MAIN` + criação de salas públicas/privadas e convite direto via `?room=CODIGO`), sincronização de posição/rotação/animação com interpolação suave, ocupação exclusiva de 22 assentos, chat em tempo real com balões 3D sobre os personagens, estado sincronizado da TV e transferência automática de anfitrião (*Host*).

---

## 🎮 Controles

| Comando | Ação |
| :--- | :--- |
| **W, A, S, D** | Movimentar personagem |
| **Botão Direito do Mouse (SEGURAR / HOLD)** | Orbitar câmera em 3ª pessoa (soltar libera o cursor imediatamente) |
| **Scroll do Mouse** | Zoom da câmera orbital |
| **Shift Esquerdo** | Correr |
| **Espaço** | Pular / Levantar do assento |
| **Tecla E** (ou Clique) | Sentar / Levantar de sofás, pufes e banquetas |
| **Tecla T** (ou Clique na TV) | Abrir Central de Controle do Cinema Social 3D |
| **Teclas 1, 2, 3, 4** | Emotes rápidos (Acenar, Dançar, Celebrar, Rir) |

---

## 🚀 Como Executar Localmente

```bash
# 1. Instalar dependências
npm install

# 2. Compilar frontend (Vite) e backend (TypeScript)
npm run build

# 3. Iniciar servidor unificado (http://localhost:3001)
npm start
```
