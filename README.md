# 🛡️ CyberDefender — 3D Cyberpunk FPS Engine

![Three.js](https://img.shields.io/badge/Three.js-r185-black?style=for-the-badge&logo=three.js)
![JavaScript](https://img.shields.io/badge/JavaScript-ES6+-yellow?style=for-the-badge&logo=javascript)
![WebRTC](https://img.shields.io/badge/WebRTC-PeerJS-red?style=for-the-badge&logo=webrtc)
![Node.js](https://img.shields.io/badge/Node.js-Express-green?style=for-the-badge&logo=node.js)
![License](https://img.shields.io/badge/License-MIT-blue?style=for-the-badge)

**CyberDefender** é um jogo de tiro em primeira pessoa (FPS 3D) cyberpunk e retrô-futurista de alta performance, construído diretamente para navegadores web utilizando **Three.js**, **Vanilla JavaScript (ES6 Modules)**, **PeerJS (WebRTC)** e um servidor dedicado de pontuações em **Node.js/Express**.

O projeto destaca-se por combinar gráficos 3D fluidos, combate frenético contra hordas de IA, batalhas de chefões multicamadas, terminal interativo de linha de comando (`CyberOS`), e suporte a rede P2P em tempo real — tudo isso sem depender de engines pesadas de terceiros (como Unity ou Unreal).

---

## 📌 Sumário
- [O Conceito Central](#-o-conceito-central)
- [Arquitetura do Motor & Sistemas Core](#-arquitetura-do-motor--sistemas-core)
  - [1. Engine 3D & Pipeline de Renderização](#1-engine-3d--pipeline-de-renderização)
  - [2. Hierarquia de IA & Inimigos](#2-hierarquia-de-ia--inimigos)
  - [3. Arsenal, Balística & Sistema de Upgrades](#3-arsenal-balística--sistema-de-upgrades)
- [Mecânicas de Jogo e Ferramentas Livres](#-mecânicas-de-jogo-e-ferramentas-livres)
  - [O Terminal CyberOS & Shell Interativo](#o-terminal-cyberos--shell-interativo)
  - [Confrontos Épicos de Chefões (Boss Fights)](#confrontos-épicos-de-chefões-boss-fights)
  - [Rede P2P Multiplayer & Global Leaderboard](#rede-p2p-multiplayer--global-leaderboard)
- [Executando o Projeto & Servidor](#-executando-o-projeto--servidor)

---

## 🎯 O Conceito Central

![Visão Geral do CyberDefender](./Assets/cyberhome.png)

O objetivo do jogador em **CyberDefender** é assumir o controle de um soldado cibernético e defender o núcleo da infraestrutura virtual contra ondas crescentes de ameaças biomecânicas e programas de extermínio corrompidos.

> [!IMPORTANT]
> O projeto foi desenvolvido com uma filosofia **Zero-Engine Bloat**: todos os sistemas de física de projéteis, colisão de malhas 3D, detecção de visada (*line-of-sight*), gerenciamento de ondas de inimigos e interface futurista (HUD com Radar 2D dinâmico) foram implementados do zero em JavaScript.

---

## 🧠 Arquitetura do Motor & Sistemas Core

### 1. Engine 3D & Pipeline de Renderização
A arquitetura do motor é modular e desacoplada, dividida em gerenciadores especializados:

![Estrutura dos Sistemas do Jogo](./Assets/cyberbrain.png)

* **Game Core Loop (`Game.js`):** Loop principal de renderização com *requestAnimationFrame*, atualização vetorial contínua, interpolação de física e efeito dinâmico de vertigem/vibração de câmera.
* **Sistema de Iluminação & Cenas (`WorldGenerator.js`):** Construção dinâmica de arenas sci-fi (Arena, Arsenal, Castle Citadel, Space Void) com luzes pontuais (*PointLights*), névoa volumétrica e sombras projetadas.
* **Partículas & Efeitos Especiais (`ParticleSystem.js`):** Motor de partículas customizado para faíscas de projéteis, sangue cibernético, explosões de plasma e rastros de tiros em tempo real.
* **HUD Futurista com Radar 2D (`GameUI.js`):** Interface sobreposta com barras neon de Integridade e Armadura, contador de munição, avisos de onda e um **Radar Canvas 2D dinâmico** que rastreia posições relativas dos inimigos em tempo real.

---

### 2. Hierarquia de IA & Inimigos
O jogo possui uma vasta taxonomia de inimigos, cada um com padrões comportamentais e algoritmos de combate distintos:

| Classe de Inimigo | Comportamento de Combate | Especialidade / Ataque |
| :--- | :--- | :--- |
| **Melee & Knight** | Investida direta curta distância | Dano contínuo de área e alta resistência física |
| **Archer & Sniper** | Posicionamento à distância & Visada | Projéteis de precisão e travamento de mira |
| **Assassin & Ninja** | Esquiva lateral & Teleporte | Flanqueamento rápido e ataques críticos surpresa |
| **Shield & Tank** | Linha de frente pesada | Bloqueio frontal de projéteis e alta absorção de dano |
| **Explosive & Launcher**| Supressão de área | Projéteis com dano em área (AoE) e autodestruição |
| **Citadel Eye** | Sentinela voadora 360° | Feixes de laser contínuos e varredura aérea |

---

### 3. Arsenal, Balística & Sistema de Upgrades
O sistema de armas (`WeaponFactory.js` e `WeaponSystem.js`) simula balística realista com recuo visual (*recoil*), tempo de recarga, propagação de espalhamento (*spread*) e física de projéteis:

* **Pistola Laser & Submetralhadora:** Alta taxa de disparo e disparo contínuo.
* **Escopeta de Plasma:** Espalhamento cônico de múltiplos projéteis para combate próximo.
* **Lança-Foguetes & Railgun:** Projéteis pesados com dano explosivo e penetração de armadura.
* **Upgrades no Arsenal (`UpgradeManager.js`):** Colete dados em campo para desbloquear melhorias permanentes de taxa de tiro, capacidade de pente, velocidade de movimento e escudos de energia.

---

## 🎮 Mecânicas de Jogo e Ferramentas Livres

### 💻 O Terminal CyberOS & Shell Interativo
Em vez de um menu principal genérico, o jogo inicia através da interface de linha de comando **CyberOS** com um robô em Canvas interativo que rastreia os movimentos do cursor:

![Terminal CyberOS](./Assets/cybershell.png)

* **Sequência de Boot:** Telas de inicialização no estilo terminal sci-fi (`MOUNTING VOLUMES [C:/ROOT]`, `LOADING NEURAL_NET.SYS`).
* **Comandos & Flags no Terminal:**
  * `start [nome]` — Inicia a campanha padrão.
  * `start -castle` — Salta diretamente para a onda 11 na Fortaleza Cybernética.
  * `start -bossrush` — Modo arena contra a sequência de chefões.
  * `start -skip` — Inicia o combate sem as sequências cinematográficas introdutórias.
  * `fetch` / `clear` / `help` — Relatórios do sistema e utilitários.

---

### 👹 Confrontos Épicos de Chefões (Boss Fights)
A cada marco de ondas, o jogador enfrenta chefões massivos com barras de vida independentes e mecânicas de fases:

> [!WARNING]
> Ao detectar uma assinatura de alta energia (`WARNING: HIGH ENERGY SIGNATURE DETECTED`), a arena entra em modo de bloqueio e o boss assume o combate!

* **ED-209 Boss:** Mecha bípede com rajadas de metralhadoras duplas e mísseis guiados.
* **Observer Boss:** Olho mecânico gigante com lasers giratórios de 360° e invocação de lacaios.
* **The Herald:** Entidade cibernética de alta mobilidade com padrões de ataque baseados em fases.
* **Atom Boss:** Núcleo de energia com campos de repulsão eletromagnética e tempestades de plasma.

---

### 🌐 Rede P2P Multiplayer & Global Leaderboard
* **Multiplayer P2P (PeerJS / WebRTC):** Permite conexões diretas entre jogadores (*Peer-to-Peer*) para sessões cooperativas ou modos versus sem necessidade de servidores intermediários de jogo.
* **Servidor Node.js & Express (`server.js`):** API REST dedicada que armazena os recordes globais (`/api/leaderboard`) e sincroniza o *Hall da Fama* diretamente no terminal CyberOS.

---

## 🚀 Executando o Projeto & Servidor

### Pré-requisitos
* **Navegador Moderno:** Chrome, Firefox, Edge ou Brave com suporte a ES6 Modules e WebGL.
* **Node.js (Opcional, para o servidor de Leaderboard):** v16+ instalado.

### 1. Modo Cliente (Direto no Navegador)
Não é necessário compilar nada. Abra diretamente o arquivo `index.html` em um servidor local HTTP (como Live Server ou `npx serve`):
```bash
# Executando um servidor estático simples
npx serve .
```

### 2. Executando o Servidor de Leaderboard (Node.js + Express)
Para ativar o salvamento global de pontuações e o ranking de jogadores:

```bash
# Instalar as dependências
npm install

# Iniciar o servidor de pontuações (Porta 8080 ou customizada)
node server.js
```
O servidor estará rodando em `http://localhost:8080` com a API em `http://localhost:8080/api/leaderboard`.

---

> [!TIP]
> **Dev Console Embutido:** Durante o jogo, abra o console de desenvolvedor ou use os comandos do `CyberOS` para testar armas, alternar mapas e debugar a IA dos inimigos em tempo real.
