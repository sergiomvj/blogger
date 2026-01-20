# Sistema de Design - BlogPlugin (Premium Dark Architecture)

Este documento contém as definições de design, cores, fontes e padrões de UI utilizados no projeto **BlogPlugin**, estruturados para serem replicados em outros projetos que buscam uma estética "Premium Digital".

## 1. Paleta de Cores (Color Palette)

### Cores Principais
- **Primary (Brand):** `#135bec` (Um azul elétrico vibrante)
- **Secondary/Accent:** `#7c3aed` (Violet/Purple para gradientes e detalhes)
- **Success:** `#10b981` (Emerald)
- **Warning:** `#f59e0b` (Amber)
- **Danger:** `#f43f5e` (Rose)

### Tons de Fundo (Dark Mode)
- **Background Default:** `#101622` (Deep Space Blue)
- **Surface (Card):** `#1e2430` (Ligeiramente mais claro para contraste)
- **Surface Darker:** `#111827` (Uso em sidebars ou rodapés)
- **Overlay White:** `rgba(255, 255, 255, 0.05)` (Para efeitos de vidro/glassmorphism)

### Tipografia e Texto
- **Text Main:** `#ffffff` (White - Puro)
- **Text Secondary:** `#94a3b8` (Slate-400)
- **Text Muted:** `#475569` (Slate-600)
- **Border/Divider:** `rgba(255, 255, 255, 0.1)` (White 10%)

---

## 2. Tipografia (Typography)

- **Fonte Principal:** [Inter](https://fonts.google.com/specimen/Inter)
- **Estilo Base:** `sans-serif`, `antialiased`
- **Configurações Sugeridas:**
  - **Headings:** Bold ou Semi-bold, `tracking-tight` (-0.025em).
  - **Labels/Meta:** Uppercase, `tracking-widest` (0.1em a 0.3em), `font-bold`, tamanho reduzido (10px - 12px).
  - **Inputs:** Regular, 14px - 16px.

---

## 3. Elementos de Interface (UI Components)

### Glassmorphism (Cartões e Modais)
- **Background:** `bg-white/5`
- **Blur:** `backdrop-blur-xl`
- **Borda:** `border border-white/10`
- **Raio:** `rounded-3xl` (24px)
- **Sombra:** `shadow-2xl shadow-primary/20`

### Botões Premium
- **Background:** `bg-primary` (`#135bec`)
- **Hover:** `hover:bg-blue-600`
- **Click:** `active:scale-[0.98]`
- **Transição:** `transition-all duration-200`
- **Arredondamento:** `rounded-xl` (12px)
- **Efeito:** Sombra suave com a cor da marca (`shadow-lg shadow-primary/30`).

### Inputs e Formulários
- **Base:** `bg-white/5`
- **Borda:** `border border-white/10`
- **Focus:** `focus:border-primary/50`, `focus:ring-1 focus:ring-primary/20`
- **Padding:** Vertical 14px (`py-3.5`), Horizontal com ícone (`pl-12`).

---

## 4. Efeitos e Gráficos (Visual Effects)

### Mesh Gradients (Glows)
Utilize divs absolutas com blur alto para criar profundidade:
- **Topo Direito:** `bg-primary/20`, blur 100px.
- **Base Esquerda:** `bg-violet-500/10`, blur 100px.

### Ícones
- **Biblioteca:** [Material Symbols Outlined](https://fonts.google.com/icons?icon_set=Material+Symbols)
- **Utilitário CSS:**
  ```css
  .filled {
      font-variation-settings: 'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24;
  }
  ```

---

## 5. Configuração Tailwind (Destaques)

```javascript
// tailwind.config.js
export default {
    theme: {
        extend: {
            colors: {
                "primary": "#135bec",
                "background-light": "#f6f6f8",
                "background-dark": "#101622",
                "surface-dark": "#1e2430",
                "surface-darker": "#111827",
            },
            fontFamily: {
                sans: ['Inter', 'sans-serif'],
                display: ['Inter', 'sans-serif'],
            }
        }
    }
}
```
