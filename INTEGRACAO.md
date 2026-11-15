# Avatares do SkyLounge

Extraia o pacote na raiz do projeto. O modelo fica em `public/models/avatars.glb`. O componente de exemplo e o seletor de aparência ficam em `src/avatars/`. O GLB contém os três personagens derivados de Mimo, Mimo Esguio e Mima, um esqueleto e uma biblioteca de módulos.

## Exemplo em React Three Fiber

```jsx
import { SkyAvatar } from './avatars/SkyAvatar.jsx';

<SkyAvatar
  position={[0, 0, 0]}
  clip="walk"
  appearance={{
    bodyStyle: 'feminine',
    outfitStyle: 'hoodie',
    hairStyle: 'ponytail',
    accessory: ['earrings', 'bow'],
    skinColor: '#C48F72',
    primaryColor: '#68B8A9',
    secondaryColor: '#485676',
    hairColor: '#50394B'
  }}
  talking={false}
  headYaw={0}
  headPitch={0}
/>
```

## Seleção dos módulos

O GLB é uma biblioteca. Um visualizador genérico pode desenhar todas as alternativas sobrepostas. Aplique a seleção no clone antes do primeiro desenho. O componente já faz isso. Se o jogo tiver um componente próprio, use `prepareAvatar(clone(scene))` com o clone completo de `SkeletonUtils.clone`. Guarde a referência ao clone para o mixer e para a cena. Chame `ui.apply(opções)` ao mudar a aparência e `ui.dispose()` ao remover o avatar.

| Campo | Valores |
|---|---|
| bodyStyle | masculine, masculine_heavy, feminine |
| outfitStyle | jacket, hoodie, blazer, vest, dress, skirt_set, offshoulder, jumpsuit |
| hairStyle | spiky, bob, curly, ponytail, waves, long_waves, long_straight, twintails, high_bun |
| accessory | glasses, headphones, crown, beanie, tiara, earrings, bow |

Use `null` para retirar roupas, cabelo ou acessórios. O campo `accessory` também aceita uma lista. Cada conjunto `Outfit_<estilo>` contém três ajustes `Wear_<estilo>_<corpo>`. Ative só o ajuste correspondente a `Body_<corpo>`. O seletor cuida disso. A aparência inicial usa corpo masculino, moletom e topete.

Os materiais compartilhados por peças de uma pessoa são clonados por instância. `Mat_Skin`, `Mat_Primary`, `Mat_Secondary` e `Mat_Hair` recebem as quatro cores. Os demais são `Mat_AccentGold`, `Mat_White`, `Mat_Dark` e `Mat_Blush`. O material de cabelo usa uma textura de mechas de 256 × 256 incorporada ao GLB. A cor continua configurável por instância. Para aplicar uma estampa repetida, atribua uma textura sRGB ao `map` do material do clone, defina `texture.flipY = false`, configure repetição conforme desejado e marque `material.needsUpdate = true`. As UVs são projeções locais para padrões repetidos. Uma ilustração contínua entre painéis requer UVs próprias.

## Animação e posicionamento

A frente é +Z, a vertical é +Y e a altura dos corpos em repouso é 1,706 m. A origem fica na sola. O objeto raiz mantém posição e orientação durante os clipes. Desloque o avatar pelo grupo externo conforme a velocidade do jogo.

| Uso | Clipes |
|---|---|
| Locomoção | idle, walk, run, jump |
| Assentos | sit_sofa, sit_chaise, sit_pouf, sit_cushion, sit_vip, sit_armchair, sit_barstool |
| Emotes | wave, dance, cheer, laugh, talk_gesture |

Ao sentar, coloque a raiz no topo da almofada e aponte +Z para a frente do assento. O centro de `Hips` oscila de 0,096 a 0,102 m acima desse ponto. A altura dos braços e o comprimento útil do assento dependem dos móveis do jogo. Nos clipes de movimento, o salto vertical é visual. Se a física do jogo também animar a altura durante `jump`, ajuste a apresentação para evitar somar dois saltos completos.

Para piscar ou simular fala, use `ui.expression('blink', valor)` e `ui.expression('talk', valor)` com pesos de 0 a 1. O exemplo inclui piscadas e fala procedural. Para orientar o olhar, o exemplo compõe `headYaw` e `headPitch` em radianos com a rotação de `Head` após o mixer.

Os encaixes são filhos diretos de `Head`: `Socket_Hair`, `Socket_Glasses`, `Socket_Hat`, `Socket_Headphones`, `Socket_Ears` e `Socket_BackHair`. Os módulos fornecidos já estão alinhados nesses encaixes. Adicione acessórios externos no espaço local do socket escolhido. O ponto das orelhas fica centralizado para receber um par de brincos.

## Verificação da entrega

Importação e clonagem testadas com Three.js r169. O teste percorreu as 24 combinações de corpo e roupa, verificou a independência das cores entre clones, acionou os morphs, leu os seis sockets e amostrou os 16 clipes. O corpo base tem 6.016 triângulos. Como referência, corpo masculino, rosto, moletom e topete somam 21.776 triângulos visíveis. O custo muda com a seleção.

O validador Khronos encontrou zero erros. Os 28 avisos de hierarquia se referem às malhas com skin agrupadas sob nós. Use esses grupos para visibilidade e transforme o avatar completo para posicioná-lo. A prova de integração foi feita fora do cenário do jogo.
