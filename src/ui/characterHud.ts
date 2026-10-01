import { MOODS } from '../content/moods';
import type { Actions } from '../state/actions';
import type { Store } from '../state/store';
import { motion } from './kit/anim';
import { h } from './kit/dom';
import { panel, sealButton, vial } from './kit/components';
import { bandLoyalty, reputationTitle } from './text';
import { outfitOf, paintEdmund, type EdmundPose } from './edmundSprite';
import { MASTER, C } from '../assets/palette';

const EMOTES: EdmundPose[] = ['shrug', 'cap', 'glass'];

export function mountCharacterHud(root: HTMLElement, store: Store, act: Actions) {
  const canvasHost = h('button.char-diorama', { type: 'button', title: 'A small courtesy' });
  const name = h('div.name');
  const house = h('div.house');
  const title = h('div.rep-title');
  const mood = h('div.char-mood');
  const health = vial({ tone: 'loss', orient: 'v', value: 0, label: 'HP', icon: 'heart', tip: 'health', cls: 'gauge' });
  const energy = vial({ tone: 'gold', orient: 'v', value: 0, label: 'En', icon: 'sun', tip: 'vigour', cls: 'gauge' });
  const stress = vial({ tone: 'heat', orient: 'v', value: 0, label: 'Str', icon: 'warn', tip: 'stress', cls: 'gauge' });
  const legit = vial({ tone: 'profit', orient: 'h', value: 0, label: 'L', icon: 'crown', tip: 'legitimacy', cls: 'tri' });
  const heatV = vial({ tone: 'heat', orient: 'h', value: 0, label: 'H', icon: 'eye', tip: 'heat', cls: 'tri' });
  const loy = vial({ tone: 'loyalty', orient: 'h', value: 0, label: 'Y', icon: 'people', tip: 'loyalty', cls: 'tri' });

  const wrap = panel({ cls: 'char-hud' });
  const fold = sealButton({
    glyph: '▾',
    size: 'sm',
    color: 'woad',
    cls: 'char-fold',
    tip: { title: 'Fold the portrait', desc: 'Tuck Edmund away. Hotkey C.', hotkey: 'C' },
    onClick: (e) => {
      e.stopPropagation();
      act.toggleCharHud();
    },
  });

  const left = h('div.char-seals-col.char-seals-left');
  const right = h('div.char-seals-col.char-seals-right');
  const stage = h('div.char-stage', canvasHost, h('div.char-ring', health.el, energy.el, stress.el), h('div.char-tri', legit.el, heatV.el, loy.el));
  const id = h('div.char-id', name, house, title);
  wrap.body.append(fold, left, stage, right, id, mood);
  root.append(wrap.el);

  let lastPence = store.state.money.pence;
  let coinsUntil = 0;
  let emote: EdmundPose | null = null;
  let emoteUntil = 0;
  let emoteI = 0;
  let typed = 0;
  let moodSrc = '';
  let blinkUntil = 0;
  let nextBlink = 2.4;
  let t = 0;
  let poseDrawn: string | null = null;

  canvasHost.addEventListener('click', (e) => {
    e.stopPropagation();
    if (store.state.ui.charHudCollapsed) {
      act.toggleCharHud();
      return;
    }
    emote = EMOTES[emoteI++ % EMOTES.length];
    emoteUntil = t + 1.35;
  });
  wrap.el.addEventListener('click', (e) => {
    if (!store.state.ui.charHudCollapsed) return;
    if ((e.target as HTMLElement).closest('.char-fold')) return;
    e.stopPropagation();
    act.toggleCharHud();
  });

  const SEALS: { icon: 'heart' | 'cloth' | 'scroll' | 'warehouse' | 'book' | 'people' | 'crown' | 'moon'; key: string; title: string; desc: string; run: () => void; badge: (s: typeof store.state) => boolean }[] = [
    { icon: 'heart', key: '', title: 'Character sheet', desc: 'Skills, vitals, and the state of the heir.', run: () => act.openPanel('character', 'skills'), badge: (s) => s.player.conditions.includes('Grieving') },
    { icon: 'cloth', key: 'G', title: 'Wardrobe and gear', desc: 'What you wear is what they see.', run: () => act.openPanel('inventory', 'wardrobe'), badge: () => false },
    { icon: 'scroll', key: 'L', title: 'Ledger and finances', desc: 'The tally, the debts, the purse.', run: () => act.openPanel('ledger'), badge: (s) => s.money.debts.some((d) => d.dueDay - s.clock.day <= 14) },
    { icon: 'warehouse', key: 'I', title: 'Inventory and warehouses', desc: 'Sacks on the quay and in the hold.', run: () => act.openPanel('inventory'), badge: (s) => s.assets.warehouses.some((w) => w.condition < 40) },
    { icon: 'book', key: 'J', title: 'Journal and deals', desc: 'News, rumours, and open bargains.', run: () => act.openPanel('journal'), badge: (s) => s.news.length > s.ui.newsRead || s.deals.some((d) => d.dueDay - s.clock.day <= 10) },
    { icon: 'people', key: 'B', title: 'Contacts and band', desc: 'Household, hirelings, and faces.', run: () => act.openPanel('relations', 'people'), badge: (s) => s.band.some((b) => b.loyalty < 40) },
    { icon: 'crown', key: 'F', title: 'Family and estate', desc: 'The house, the warehouse, the name.', run: () => act.openPanel('character', 'estate'), badge: () => false },
    { icon: 'moon', key: '', title: 'Rest until morning', desc: 'Skip to the next dawn. A mock of sleep.', run: () => act.rest(), badge: () => false },
  ];

  const sealBtns = SEALS.map((spec) => {
    const b = sealButton({
      icon: spec.icon,
      size: 'md',
      color: spec.icon === 'moon' ? 'woad' : 'madder',
      hotkey: spec.key || undefined,
      tip: { title: spec.title, desc: spec.desc, hotkey: spec.key || undefined },
      onClick: spec.run,
    });
    b.classList.add('char-seal');
    return { spec, b };
  });
  sealBtns.slice(0, 4).forEach((s) => left.append(s.b));
  sealBtns.slice(4).forEach((s) => right.append(s.b));

  store.select(
    (s) => ({
      inGame: s.ui.inGame,
      menu: s.ui.menu,
      collapsed: s.ui.charHudCollapsed,
      name: s.player.name,
      loc: s.player.location,
      pence: s.money.pence,
      hp: Math.round(s.player.vitals.health.value),
      en: Math.round(s.player.vitals.vigour.value),
      nerve: Math.round(s.player.meters.nerve.value),
      rep: Math.round(s.player.meters.reputation.value),
      heat: Math.round(s.player.meters.heat.value),
      loy: bandLoyalty(s.band),
      news: s.news.length,
      read: s.ui.newsRead,
      gown: s.player.wardrobe.map((w) => w.item).join('|'),
    }),
    (v) => {
      wrap.el.style.display = v.inGame && !v.menu ? '' : 'none';
      wrap.el.classList.toggle('collapsed', v.collapsed);
      root.classList.toggle('char-collapsed', v.collapsed);
      const g = fold.querySelector('.seal-glyph');
      if (g) g.textContent = v.collapsed ? '▴' : '▾';
      fold.title = v.collapsed ? 'Unfold the portrait' : 'Fold the portrait';
      const s = store.state;
      name.textContent = s.player.name;
      house.textContent = 'Heir of Ashby & Sons, Woolmen of Lincoln';
      title.textContent = reputationTitle(v.rep, v.heat);
      health.set(v.hp);
      energy.set(v.en);
      stress.set(100 - v.nerve);
      legit.set(v.rep);
      heatV.set(v.heat);
      loy.set(v.loy);
      legit.el.style.setProperty('--liquid', v.rep < 40 ? MASTER[C.woad] : v.rep < 70 ? MASTER[C.woadMid] : MASTER[C.saffron]);
      heatV.el.classList.toggle('hot', v.heat >= 55);
      if (v.pence !== lastPence) {
        coinsUntil = t + 1.6;
        lastPence = v.pence;
      }
      for (const { spec, b } of sealBtns) b.classList.toggle('has-badge', spec.badge(s));
    },
  );

  return {
    tick(dt: number) {
      if (!store.state.ui.inGame || store.state.ui.menu) return;
      t += dt;
      const s = store.state;
      const reduced = motion.reduced || s.settings.reduceMotion;
      const hour = (s.clock.minute / 60) % 24;
      const night = hour < 6 || hour >= 20.5;
      const { garb, hoodOn } = outfitOf(s.player.wardrobe);
      const heat = s.player.meters.heat.value;
      const rep = s.player.meters.reputation.value;

      if (emote && t > emoteUntil) emote = null;
      if (t > nextBlink) {
        blinkUntil = t + 0.12;
        nextBlink = t + 2.2 + (t % 3) * 0.7;
      }

      let pose: EdmundPose = 'idle';
      if (emote) pose = emote;
      else if (t < coinsUntil) pose = 'coins';
      else if (!reduced && t < blinkUntil) pose = 'blink';
      else if (heat >= 55) pose = 'slump';
      else if (rep >= 62 && heat < 32) pose = 'proud';
      else if (night && Math.sin(t * 0.55) > 0.55) pose = 'glance';

      const breathe: 0 | 1 = reduced || pose === 'slump' || pose === 'proud' ? 0 : Math.sin(t * 1.7) > 0 ? 1 : 0;
      const flicker = night && Math.sin(t * 9) > 0;
      const key = `${pose}|${garb}|${hoodOn}|${night}|${flicker}|${breathe}`;
      if (key !== poseDrawn) {
        poseDrawn = key;
        canvasHost.replaceChildren(paintEdmund(pose, garb, hoodOn, night, flicker, breathe));
      }

      const idx = Math.floor(s.clock.day / 3) % MOODS.length;
      const src = MOODS[idx];
      if (src !== moodSrc) {
        moodSrc = src;
        typed = reduced ? src.length : 0;
      }
      if (typed < src.length) {
        typed = Math.min(src.length, typed + dt * 22);
        mood.textContent = src.slice(0, Math.floor(typed));
      }
    },
  };
}
