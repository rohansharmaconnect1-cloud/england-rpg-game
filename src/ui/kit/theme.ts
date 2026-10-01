import { C, applyCssPalette } from '../../assets/palette';
import { beadUrl, grainUrl, leverSheetUrl, panelBorderUrl, pinUrl, stampBorderUrl } from '../../assets/textures';

/** Publish palette colours and generated pixel textures as CSS custom properties. */
export function applyTheme() {
  const root = document.documentElement;
  applyCssPalette(root);
  const set = (k: string, url: string) => root.style.setProperty(k, `url(${url})`);
  set('--img-panel', panelBorderUrl('parchment'));
  set('--img-panel-dark', panelBorderUrl('dark'));
  set('--img-grain', grainUrl(false));
  set('--img-grain-dark', grainUrl(true));
  set('--img-stamp', stampBorderUrl(C.madder));
  set('--img-stamp-ink', stampBorderUrl(C.ink));
  set('--img-stamp-woad', stampBorderUrl(C.woad));
  set('--img-lever', leverSheetUrl());
  set('--img-pin', pinUrl());
  set('--img-bead', beadUrl());
}
