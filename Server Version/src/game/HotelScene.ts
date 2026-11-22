import Phaser from 'phaser';
import type { Simulation } from './simulation';
import { FLOOR_BY_LEVEL, floorName } from './hotel';
import { makeCharacterTexture, SPRITE_H } from './pixelSprites';
import { FURNITURE_SPRITES, makeFurnitureTexture } from './furnitureSprites';
import type { Agent } from './types';

interface AgentView {
  sprite: Phaser.GameObjects.Image;
  shadow: Phaser.GameObjects.Ellipse;
  name: Phaser.GameObjects.Text;
  bubbleBg: Phaser.GameObjects.Graphics;
  bubbleText: Phaser.GameObjects.Text;
}

/** 名字颜色按身份区分：长住客米白、走班员工青、短租客人粉 */
const KIND_NAME_COLOR: Record<string, string> = {
  resident: '#f3ead9',
  staff: '#9fe6d8',
  guest: '#f0b9c6',
};

/** 轮廓透明、自带落地阴影的家具，不再叠加通用方角投影（避免沙滩上出现异色方块）。 */
const TRANSPARENT_FURNITURE = new Set<string>(['umbrella', 'car']);

export class HotelScene extends Phaser.Scene {
  private sim: Simulation;
  private views = new Map<string, AgentView>();
  private selRing!: Phaser.GameObjects.Graphics;
  private coachCar!: Phaser.GameObjects.Image;
  private floorLayer!: Phaser.GameObjects.Container;
  private floorTitle!: Phaser.GameObjects.Text;
  private tick = 0;

  /* 相机拖动 / 缩放 */
  private readonly zoomMin = 1;
  private readonly zoomMax = 3;
  private dragMoved = false;
  private dragStartX = 0;
  private dragStartY = 0;
  private pinchPrev = 0;

  constructor(sim: Simulation) {
    super('hotel');
    this.sim = sim;
  }

  create(): void {
    this.cameras.main.setBackgroundColor('#0d0b16');

    this.floorLayer = this.add.container(0, 0).setDepth(0);

    this.floorTitle = this.add
      .text(22, 16, '', {
        fontFamily: '"PingFang SC","Microsoft YaHei",sans-serif',
        fontSize: '18px',
        color: '#efe6d8',
        stroke: '#0d0b16',
        strokeThickness: 4,
      })
      .setDepth(900);

    this.drawFloor();

    this.selRing = this.add.graphics().setDepth(99);

    // 接送客人的车辆（同一时刻只有一趟行程，共用一个车视图）
    makeFurnitureTexture(this, 'coach-car', 'car', 96, 46, 0xb8452f);
    this.coachCar = this.add.image(0, 0, 'coach-car').setOrigin(0.5, 1).setDepth(200).setVisible(false);

    // 已有角色（12 位长住客）先建视图，后续动态增删由事件驱动
    for (const agent of this.sim.agents) this.addView(agent);

    this.sim.on('agent-added', (id) => {
      const a = this.sim.getAgent(id as string);
      if (a) this.addView(a);
    });
    this.sim.on('agent-removed', (id) => this.removeView(id as string));
    this.sim.on('def-changed', (id) => this.refreshView(id as string));
    this.sim.on('floor', () => {
      this.drawFloor();
      for (const agent of this.sim.agents) {
        const v = this.views.get(agent.def.id);
        if (v) this.applyVisibility(agent, v);
      }
    });

    this.setupCameraControl();

    this.cameras.main.fadeIn(600, 13, 11, 22);
  }

  /* ------------------------- 相机拖动 / 缩放 ------------------------- */
  /**
   * 场景可拖动、可缩放：鼠标滚轮 / 双指捏合缩放（以光标或双指中心为锚点），
   * 按住拖动平移。缩放与平移都被限制在 960×640 的世界范围内，不会看到画布外的空白。
   * 只有位移很小的「点击」才会触发取消选中，避免拖动误触。
   */
  private setupCameraControl(): void {
    const cam = this.cameras.main;
    cam.setBounds(0, 0, 960, 640);
    this.input.addPointer(1); // 再开一个指针位，手机端才能双指捏合

    this.input.on('wheel', (p: Phaser.Input.Pointer, _o: unknown, _dx: number, dy: number) => {
      this.zoomAt(p.x, p.y, dy < 0 ? 1.12 : 1 / 1.12);
    });

    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      if (p.button !== 0) return; // 只用左键 / 单指
      this.dragStartX = p.x;
      this.dragStartY = p.y;
      this.dragMoved = false;
    });

    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (!p.isDown) return;
      const p1 = this.input.pointer1;
      const p2 = this.input.pointer2;

      // 双指捏合：优先于拖动
      if (p1.isDown && p2.isDown) {
        const dist = Phaser.Math.Distance.Between(p1.x, p1.y, p2.x, p2.y);
        if (this.pinchPrev > 0 && dist > 0) {
          this.zoomAt((p1.x + p2.x) / 2, (p1.y + p2.y) / 2, dist / this.pinchPrev);
        }
        this.pinchPrev = dist;
        this.dragMoved = true;
        return;
      }
      this.pinchPrev = 0;

      const dx = p.x - p.prevPosition.x;
      const dy = p.y - p.prevPosition.y;
      if (Math.abs(p.x - this.dragStartX) + Math.abs(p.y - this.dragStartY) > 6) this.dragMoved = true;
      cam.scrollX -= dx / cam.zoom;
      cam.scrollY -= dy / cam.zoom;
      this.clampCamera();
    });

    this.input.on('pointerup', (p: Phaser.Input.Pointer) => {
      this.pinchPrev = 0;
      // 点空白处（且没有发生拖动）才取消选中，拖动画布时不误触
      if (!this.dragMoved && this.input.hitTestPointer(p).length === 0) this.sim.select(null);
      this.dragMoved = false;
    });
  }

  /** 以屏幕点 (screenX, screenY) 为锚点缩放：锚点下方的世界坐标保持不动。 */
  private zoomAt(screenX: number, screenY: number, factor: number): void {
    const cam = this.cameras.main;
    const z0 = cam.zoom;
    const z1 = Phaser.Math.Clamp(z0 * factor, this.zoomMin, this.zoomMax);
    if (z1 === z0) return;

    const dx = screenX - cam.width / 2;
    const dy = screenY - cam.height / 2;
    const wx = cam.scrollX + cam.width / 2 + dx / z0;
    const wy = cam.scrollY + cam.height / 2 + dy / z0;

    cam.setZoom(z1);
    cam.scrollX = wx - cam.width / 2 - dx / z1;
    cam.scrollY = wy - cam.height / 2 - dy / z1;
    this.clampCamera();
  }

  /** 把相机视野夹回世界范围（复用 Phaser 自身的边界算法，与 zoom 保持一致）。 */
  private clampCamera(): void {
    const cam = this.cameras.main;
    cam.scrollX = cam.clampX(cam.scrollX);
    cam.scrollY = cam.clampY(cam.scrollY);
  }

  update(_time: number, delta: number): void {
    // 低帧率时也要让模拟时间正常推进，但不能因为切后台产生巨大跳变
    this.sim.update(Math.min(delta, 250) / 1000);
    this.tick += delta;

    for (const agent of this.sim.agents) {
      const v = this.views.get(agent.def.id);
      if (v) this.syncAgent(agent, v);
    }
    this.syncCar();
    this.drawSelection();
  }

  /** 开车离场 / 接送客人的车辆视图：只显示当前楼层上正在驾驶的那位。 */
  private syncCar(): void {
    const driver = this.sim.agents.find((a) => a.driving && !a.offScene && a.floor === this.sim.viewFloor);
    if (!driver) {
      this.coachCar.setVisible(false);
      return;
    }
    this.coachCar.setVisible(true);
    this.coachCar.setPosition(driver.pos.x, driver.pos.y + 16);
    this.coachCar.setDepth(100 + driver.pos.y);
  }

  /* ------------------------- 动态角色视图 ------------------------- */
  private addView(agent: Agent): void {
    const def = agent.def;
    if (this.views.has(def.id)) return;
    const key = `char-${def.id}`;
    makeCharacterTexture(this, key, def.palette);

    const shadow = this.add.ellipse(agent.pos.x, agent.pos.y + 8, 30, 12, 0x000000, 0.35).setDepth(2);
    const sprite = this.add.image(agent.pos.x, agent.pos.y + 10, key).setOrigin(0.5, 1).setDepth(100);
    sprite.setInteractive({ useHandCursor: true });
    sprite.on('pointerdown', () => {
      // 点角色时顺带把观察者带到 TA 所在的楼层
      if (agent.floor !== this.sim.viewFloor) this.sim.setViewFloor(agent.floor);
      this.sim.select(def.id);
    });

    const name = this.add
      .text(agent.pos.x, agent.pos.y - SPRITE_H + 2, def.name, {
        fontFamily: '"PingFang SC","Microsoft YaHei",sans-serif',
        fontSize: '12px',
        color: KIND_NAME_COLOR[agent.kind] ?? '#f3ead9',
        stroke: '#100d1c',
        strokeThickness: 3,
      })
      .setOrigin(0.5, 1)
      .setDepth(1000);

    const bubbleBg = this.add.graphics().setDepth(1100);
    const bubbleText = this.add
      .text(0, 0, '', {
        fontFamily: '"PingFang SC","Microsoft YaHei",sans-serif',
        fontSize: '13px',
        color: '#221b12',
        wordWrap: { width: 180 },
        align: 'left',
      })
      .setDepth(1101)
      .setVisible(false);

    const view: AgentView = { sprite, shadow, name, bubbleBg, bubbleText };
    this.views.set(def.id, view);
    this.applyVisibility(agent, view);
  }

  private removeView(id: string): void {
    const v = this.views.get(id);
    if (!v) return;
    v.sprite.destroy();
    v.shadow.destroy();
    v.name.destroy();
    v.bubbleBg.destroy();
    v.bubbleText.destroy();
    this.views.delete(id);
    const key = `char-${id}`;
    if (this.textures.exists(key)) this.textures.remove(key);
  }

  /** 捏脸改色/换发型后重建角色贴图：先删旧纹理，再按新色板生成并挂回画面 */
  private refreshView(id: string): void {
    const agent = this.sim.getAgent(id);
    const v = this.views.get(id);
    if (!agent || !v) return;
    const key = `char-${id}`;
    if (this.textures.exists(key)) this.textures.remove(key);
    makeCharacterTexture(this, key, agent.def.palette);
    v.sprite.setTexture(key);
  }

  /** 角色此刻是否应该出现在画面上：当前楼层、未离场、未在开车（开车时由车辆代表）。 */
  private isShown(agent: Agent): boolean {
    return agent.floor === this.sim.viewFloor && !agent.offScene && !agent.driving;
  }

  /** 只显示观察者当前楼层上的角色 */
  private applyVisibility(agent: Agent, v: AgentView): void {
    const on = this.isShown(agent);
    v.sprite.setVisible(on);
    v.shadow.setVisible(on);
    v.name.setVisible(on);
    if (!on) {
      v.bubbleBg.clear();
      v.bubbleText.setVisible(false);
    }
  }

  private syncAgent(agent: Agent, v: AgentView): void {
    const on = this.isShown(agent);
    if (v.sprite.visible !== on) this.applyVisibility(agent, v);
    if (!on) return;

    const bob = agent.state === 'walking' ? Math.sin(this.tick * 0.014 + agent.pos.x) * 2.5 : 0;
    v.sprite.setPosition(agent.pos.x, agent.pos.y + 10 + bob);
    v.sprite.setDepth(100 + agent.pos.y);
    v.shadow.setPosition(agent.pos.x, agent.pos.y + 9);
    v.shadow.setDepth(2 + agent.pos.y);
    v.name.setPosition(agent.pos.x, agent.pos.y - SPRITE_H + 2 + bob);

    const speaking = !!agent.talkingWith;
    v.name.setColor(speaking ? '#ffd98a' : KIND_NAME_COLOR[agent.kind] ?? '#f3ead9');

    const shown = agent.bubble ?? (agent.state === 'gazing' ? '在窗边看海…' : undefined);
    if (shown) {
      v.bubbleText.setText(shown).setVisible(true);
      const w = v.bubbleText.width + 16;
      const h = v.bubbleText.height + 12;
      const bx = Phaser.Math.Clamp(agent.pos.x, 20 + w / 2, 940 - w / 2);
      const by = agent.pos.y - SPRITE_H - 14;
      v.bubbleText.setPosition(bx - w / 2 + 8, by - h + 6);
      v.bubbleBg.clear();
      v.bubbleBg.fillStyle(0xf6ecd8, 0.96);
      v.bubbleBg.fillRoundedRect(bx - w / 2, by - h, w, h, 8);
      v.bubbleBg.fillTriangle(bx - 6, by - 1, bx + 6, by - 1, bx, by + 8);
      v.bubbleBg.lineStyle(2, 0x2a2233, 0.35);
      v.bubbleBg.strokeRoundedRect(bx - w / 2, by - h, w, h, 8);
    } else {
      v.bubbleText.setVisible(false);
      v.bubbleBg.clear();
    }
  }

  private drawSelection(): void {
    this.selRing.clear();
    const id = this.sim.selectedId;
    if (!id) return;
    const agent = this.sim.getAgent(id);
    if (!agent || agent.floor !== this.sim.viewFloor || agent.driving || agent.offScene) return;
    const pulse = 0.5 + Math.sin(this.tick * 0.006) * 0.5;
    this.selRing.lineStyle(2, 0xe0a54a, 0.5 + pulse * 0.5);
    this.selRing.strokeEllipse(agent.pos.x, agent.pos.y + 8, 40, 18);
  }

  /* ------------------------- 楼层平面 ------------------------- */
  private drawFloor(): void {
    this.floorLayer.removeAll(true);

    const floor = this.sim.viewFloor;
    const def = FLOOR_BY_LEVEL[floor];
    if (!def) return;

    const g = this.add.graphics();
    // 背景底
    g.fillStyle(def.bg, 1);
    g.fillRect(0, 0, 960, 640);
    // 地板外描边
    g.lineStyle(2, 0xffffff, 0.05);
    g.strokeRect(8, 8, 944, 624);

    // 户外层：先铺「天空 / 海面」背景，再画沙滩、广场与公路
    if (def.level === 0) this.drawOutdoor(g);

    const sprites: Phaser.GameObjects.Image[] = [];

    for (const area of def.areas) {
      const r = area.rect;
      // 地板
      g.fillStyle(area.floorColor, 1);
      g.fillRoundedRect(r.x, r.y, r.w, r.h, 8);
      // 内发光边
      g.lineStyle(2, 0xffffff, 0.06);
      g.strokeRoundedRect(r.x + 1, r.y + 1, r.w - 2, r.h - 2, 8);
      // 地板纹理
      g.lineStyle(1, 0x000000, 0.1);
      for (let x = r.x + 16; x < r.x + r.w; x += 32) {
        g.lineBetween(x, r.y + 6, x, r.y + r.h - 6);
      }

      // 家具 / 设施 / 装饰
      for (const f of area.furniture ?? []) {
        // 通用投影：对轮廓透明、自带落地阴影的素材（如遮阳伞、轿车）跳过，
        // 避免在沙滩上出现一块与地面不同色的方角黑影。
        if (!TRANSPARENT_FURNITURE.has(f.sprite ?? '')) {
          g.fillStyle(0x000000, 0.25);
          g.fillRoundedRect(f.x + 2, f.y + 3, f.w, f.h, 4);
        }

        if (f.sprite && FURNITURE_SPRITES[f.sprite]) {
          const key = `fx-${f.sprite}-${Math.round(f.w)}x${Math.round(f.h)}-${f.color}`;
          makeFurnitureTexture(this, key, f.sprite, Math.round(f.w), Math.round(f.h), f.color);
          sprites.push(this.add.image(f.x, f.y, key).setOrigin(0, 0));
        } else {
          g.fillStyle(f.color, 1);
          g.fillRoundedRect(f.x, f.y, f.w, f.h, 4);
          g.lineStyle(1, 0xffffff, 0.08);
          g.strokeRoundedRect(f.x, f.y, f.w, f.h, 4);
        }
      }
    }
    this.floorLayer.add(g);
    for (const s of sprites) this.floorLayer.add(s);

    // 区域标签
    for (const area of def.areas) {
      const r = area.rect;
      const label = this.add
        .text(r.x + 8, r.y + r.h - 20, area.name, {
          fontFamily: '"PingFang SC","Microsoft YaHei",sans-serif',
          fontSize: '11px',
          color: '#ffffff',
        })
        .setAlpha(0.34);
      this.floorLayer.add(label);
    }

    this.floorTitle.setText(`${floorName(floor)} · ${def.name}`);
  }

  /** 户外层背景：远景天空（星月）→ 海面（波光与浪线）→ 沙滩/广场/公路由区域块叠加。 */
  private drawOutdoor(g: Phaser.GameObjects.Graphics): void {
    const skyBottom = 130;
    const seaBottom = 286;

    // 天空：分层渐变
    const bands: [number, number][] = [
      [8, 0x0a1020],
      [40, 0x101a33],
      [70, 0x18274a],
      [100, 0x213457],
      [skyBottom, 0x2b456b],
    ];
    let top = 8;
    for (const [bottom, col] of bands) {
      g.fillStyle(col, 1);
      g.fillRect(8, top, 944, bottom - top);
      top = bottom;
    }
    // 星星
    for (let i = 0; i < 60; i++) {
      const x = 16 + ((i * 137) % 928);
      const y = 12 + ((i * 53) % (skyBottom - 24));
      g.fillStyle(0xffffff, 0.25 + ((i * 17) % 5) * 0.12);
      g.fillRect(x, y, 2, 2);
    }
    // 月亮
    g.fillStyle(0xf4efd0, 1);
    g.fillCircle(806, 52, 24);
    g.fillStyle(0x101a33, 1);
    g.fillCircle(796, 46, 20);

    // 海面
    g.fillStyle(0x14314f, 1);
    g.fillRect(8, skyBottom, 944, seaBottom - skyBottom);
    g.fillStyle(0x1c4064, 1);
    g.fillRect(8, skyBottom, 944, 46);
    // 地平线高光
    g.lineStyle(2, 0x8fd0e6, 0.45);
    g.lineBetween(8, skyBottom + 1, 952, skyBottom + 1);
    // 波浪线
    for (let y = skyBottom + 26; y < seaBottom; y += 24) {
      g.lineStyle(2, 0x9fd8ec, 0.16);
      for (let x = 24; x < 940; x += 72) {
        const off = ((y / 24) % 2) * 24;
        g.lineBetween(x + off, y, x + off + 40, y);
      }
    }
    // 海面月光反射
    for (let y = skyBottom + 10; y < skyBottom + 90; y += 12) {
      g.fillStyle(0xf4efd0, 0.12);
      g.fillRect(790, y, 30, 3);
    }
  }
}
