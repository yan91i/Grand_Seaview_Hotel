import Phaser from 'phaser';
import { t } from '../i18n';

/**
 * 开场画面：GRAND SEAVIEW HOTEL 的金色 logo 从天而降，
 * 像皮球一样落地压扁再弹起，随后一道高光从右上扫到左下，
 * 右上角一颗星闪烁，最后出现「开始营业」按钮，点击进入游戏。
 */
export class IntroScene extends Phaser.Scene {
  constructor() {
    super('intro');
  }

  create(): void {
    const { width, height } = this.scale;
    this.cameras.main.setBackgroundColor('#07060f');

    this.drawBackdrop(width, height);

    /* ---------- 三行金色 logo 文字（加粗黑体 + 暗金渐变 + 深褐描边） ---------- */
    makeGoldText(this, 'intro-grand', 'Grand', 54);
    makeGoldText(this, 'intro-seaview', 'Seaview', 118);
    makeGoldText(this, 'intro-hotel', 'Hotel', 40);

    const grand = this.add.image(0, 0, 'intro-grand');
    const seaview = this.add.image(0, 0, 'intro-seaview');
    const hotel = this.add.image(0, 0, 'intro-hotel');

    // 三行极限贴近，作为一个整体 logo：Grand 压在 Seaview 左上、Hotel 压在 Seaview 右下
    const seaviewHalf = seaview.width / 2;
    grand.setPosition(-seaviewHalf * 0.32 - grand.width / 2, -seaview.height * 0.50 - grand.height * 0.18);
    seaview.setPosition(0, 0);
    hotel.setPosition(seaviewHalf * 0.36 + hotel.width / 2, seaview.height * 0.50 + hotel.height * 0.10);

    const logoGroup = this.add.container(width / 2, height / 2 - 30, [grand, seaview, hotel]);
    logoGroup.setDepth(10);
    // 起始位置在画面上方之外
    logoGroup.setY(-360);

    /* ---------- 第一阶段：加速下落（重力感） ---------- */
    this.tweens.add({
      targets: logoGroup,
      y: height / 2 - 30,
      duration: 720,
      ease: 'Cubic.easeIn',
      onComplete: () => this.squashRecover(logoGroup, width, height),
    });
  }

  /* ---------------- 背景：深色 + 远景星点 + 底部暗角 ---------------- */
  private drawBackdrop(width: number, height: number): void {
    // 远景星点
    const g = this.add.graphics().setDepth(0);
    for (let i = 0; i < 70; i++) {
      const x = (i * 173) % width;
      const y = (i * 91) % (height * 0.7);
      const a = 0.15 + ((i * 13) % 7) * 0.06;
      g.fillStyle(0xffffff, a);
      g.fillRect(x, y, 2, 2);
    }
    // 底部深蓝暗影，呼应望海楼的夜空海景
    const vignette = this.add.graphics().setDepth(1);
    vignette.fillGradientStyle(0x0a0c1c, 0x0a0c1c, 0x080a16, 0x080a16, 0, 0, 0.85, 0.85);
    vignette.fillRect(0, height * 0.55, width, height * 0.45);
  }

  /* ---------------- 第二阶段：落地压扁 -> 回弹恢复 ---------------- */
  private squashRecover(logoGroup: Phaser.GameObjects.Container, width: number, height: number): void {
    const targetY = height / 2 - 30;
    // 压扁：横向拉宽、纵向压扁、整体略下沉
    this.tweens.add({
      targets: logoGroup,
      scaleX: 1.22,
      scaleY: 0.68,
      y: targetY + 26,
      duration: 110,
      ease: 'Quad.easeOut',
      onComplete: () => {
        // 恢复：带回弹过冲
        this.tweens.add({
          targets: logoGroup,
          scaleX: 1,
          scaleY: 1,
          y: targetY,
          duration: 420,
          ease: 'Back.easeOut',
          onComplete: () => this.playSweep(logoGroup, width, height),
        });
      },
    });
  }

  /* ---------------- 第三阶段：右上 -> 左下的高光扫过 ---------------- */
  private playSweep(logoGroup: Phaser.GameObjects.Container, width: number, height: number): void {
    makeSweepTexture(this, 'intro-sweep');
    const sweep = this.add
      .image(logoGroup.x + 420, logoGroup.y, 'intro-sweep')
      .setAngle(38)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setAlpha(0)
      .setDepth(20);

    this.tweens.add({
      targets: sweep,
      x: logoGroup.x - 420,
      duration: 820,
      ease: 'Cubic.easeInOut',
    });
    this.tweens.add({
      targets: sweep,
      alpha: { from: 0, to: 0.85 },
      duration: 160,
      yoyo: true,
      hold: 520,
      onComplete: () => {
        sweep.destroy();
        this.playStar(logoGroup, width, height);
      },
    });
  }

  /* ---------------- 第四阶段：右上角星星闪烁 ---------------- */
  private playStar(logoGroup: Phaser.GameObjects.Container, width: number, height: number): void {
    const starX = width - 110;
    const starY = 100;
    const star = this.add
      .star(starX, starY, 4, 22, 9, 0xfff0b8)
      .setOrigin(0.5)
      .setAlpha(0)
      .setDepth(20);

    this.tweens.add({
      targets: star,
      alpha: { from: 0, to: 1, duration: 130, yoyo: true, repeat: 2, hold: 80 },
      scaleX: { from: 0.6, to: 1.3, duration: 240, yoyo: true, repeat: 2 },
      scaleY: { from: 0.6, to: 1.3, duration: 240, yoyo: true, repeat: 2 },
      onComplete: () => {
        this.tweens.add({
          targets: star,
          alpha: 0,
          duration: 200,
          onComplete: () => star.destroy(),
        });
        this.showStartButton(logoGroup, width, height);
      },
    });
  }

  /* ---------------- 第五阶段：「开始营业」按钮 ---------------- */
  private showStartButton(logoGroup: Phaser.GameObjects.Container, width: number, _height: number): void {
    makeGoldText(this, 'intro-start', t('intro.start'), 32);
    const btn = this.add
      .image(width / 2, logoGroup.y + 170, 'intro-start')
      .setAlpha(0)
      .setDepth(15)
      .setInteractive({ useHandCursor: true });

    // 按钮底下的光晕
    const halo = this.add
      .image(width / 2, logoGroup.y + 170, 'intro-start')
      .setAlpha(0)
      .setDepth(14)
      .setTint(0xffd87a)
      .setScale(1.6);

    this.tweens.add({ targets: [btn, halo], alpha: 1, duration: 500 });

    // 呼吸式缩放
    this.tweens.add({
      targets: btn,
      scale: 1.07,
      duration: 900,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
    this.tweens.add({
      targets: halo,
      alpha: { from: 0.18, to: 0.45 },
      scale: 1.9,
      duration: 900,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    btn.on('pointerup', () => {
      this.cameras.main.fadeOut(450, 7, 6, 15);
      this.time.delayedCall(460, () => {
        this.scene.start('hotel');
      });
    });
  }
}

/* --------------------------- 金色文字贴图 --------------------------- */

/**
 * 把一段文字渲染成「加粗黑体 + 暗金渐变填充 + 深褐描边」的贴图，
 * 字间距收紧，三行拼成一个整体 logo 图标。
 */
function makeGoldText(scene: Phaser.Scene, key: string, text: string, fontSize: number): void {
  if (scene.textures.exists(key)) return;
  // 加粗黑体：Arial Black / 苹方粗体
  const font = `900 ${fontSize}px 'Arial Black', 'Helvetica Neue', 'PingFang SC', 'Microsoft YaHei', sans-serif`;

  const probe = document.createElement('canvas').getContext('2d');
  if (probe) probe.font = font;
  const pad = Math.max(6, fontSize * 0.1);
  // 负字距让字块更紧凑
  const tracking = -fontSize * 0.06;
  const rawW = (probe?.measureText(text).width ?? fontSize * text.length * 0.55) + tracking * (text.length - 1);
  const w = Math.ceil(rawW) + pad * 2;
  const h = Math.ceil(fontSize * 1.05) + pad;

  const tex = scene.textures.createCanvas(key, w, h);
  if (!tex) return;
  const ctx = tex.getContext();
  ctx.font = font;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  const cx = w / 2;
  const cy = h / 2 + pad * 0.3;

  // 先画带阴影的深褐描边，做立体厚度
  ctx.shadowColor = 'rgba(30,16,0,0.8)';
  ctx.shadowBlur = fontSize * 0.12;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = fontSize * 0.06;
  ctx.lineWidth = Math.max(3, fontSize * 0.085);
  ctx.strokeStyle = '#1a0e00';
  drawTrackedText(ctx, text, cx, cy, tracking);

  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;

  // 暗金渐变填充
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, '#fff3c4');
  grad.addColorStop(0.2, '#f5d874');
  grad.addColorStop(0.5, '#d9a21f');
  grad.addColorStop(0.78, '#9c6b0e');
  grad.addColorStop(1, '#5a3d08');
  ctx.fillStyle = grad;
  drawTrackedText(ctx, text, cx, cy, tracking);

  // 左上高光细描边 + 右下暗面细描边，模拟金属斜面
  ctx.lineWidth = Math.max(1, fontSize * 0.022);
  ctx.strokeStyle = 'rgba(255,248,210,0.5)';
  drawTrackedText(ctx, text, cx - fontSize * 0.01, cy - fontSize * 0.018, tracking);
  ctx.lineWidth = Math.max(1, fontSize * 0.016);
  ctx.strokeStyle = 'rgba(50,26,0,0.4)';
  drawTrackedText(ctx, text, cx + fontSize * 0.01, cy + fontSize * 0.018, tracking);

  tex.refresh();
}

/** 手动按负字距绘制文字，避免 canvas 不支持 CSS letter-spacing。 */
function drawTrackedText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, tracking: number): void {
  const chars = Array.from(text);
  const widths = chars.map((ch) => ctx.measureText(ch).width);
  const total = widths.reduce((s, v) => s + v, 0) + tracking * (chars.length - 1);
  let cur = x - total / 2;
  for (let i = 0; i < chars.length; i++) {
    ctx.fillText(chars[i], cur + widths[i] / 2, y);
    ctx.strokeText(chars[i], cur + widths[i] / 2, y);
    cur += widths[i] + tracking;
  }
}

/** 高光扫条：横向透明 -> 白 -> 透明的细长渐变贴图，叠加在 logo 上模拟金属反光。 */
function makeSweepTexture(scene: Phaser.Scene, key: string): void {
  if (scene.textures.exists(key)) return;
  const w = 70;
  const h = 640;
  const tex = scene.textures.createCanvas(key, w, h);
  if (!tex) return;
  const ctx = tex.getContext();
  const grad = ctx.createLinearGradient(0, 0, w, 0);
  grad.addColorStop(0, 'rgba(255,255,255,0)');
  grad.addColorStop(0.5, 'rgba(255,255,255,0.92)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);
  tex.refresh();
}
