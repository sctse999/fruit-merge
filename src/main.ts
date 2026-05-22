import './styles.css';
import { Game } from './game/Game';

const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
const hudEl = document.getElementById('hud')!;
const overlayEl = document.getElementById('overlay')!;

const game = new Game(canvas, hudEl, overlayEl);
game.start();
