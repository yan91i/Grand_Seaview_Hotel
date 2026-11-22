import './style.css';
import Phaser from 'phaser';
import { Simulation } from './game/simulation';
import { IntroScene } from './game/IntroScene';
import { HotelScene } from './game/HotelScene';
import { createHud } from './ui/hud';
import { applyI18n, getLang } from './i18n';

// 启动时按浏览器语言设置 <html lang>，并把静态 HTML 的 data-i18n 文案写入界面
document.documentElement.lang = getLang() === 'zh' ? 'zh-CN' : 'en';
applyI18n();

const sim = new Simulation();

new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'stage',
  width: 960,
  height: 640,
  backgroundColor: '#07060f',
  pixelArt: true,
  roundPixels: true,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [new IntroScene(), new HotelScene(sim)],
});

createHud(sim);
