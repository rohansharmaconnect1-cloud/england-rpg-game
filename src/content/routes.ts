import type { Route } from '../state/types';

/** Trade lanes as (lon, lat) waypoints; sea lanes keep clear of the coast. */
export const ROUTES: Route[] = [
  // ---- required sea lanes ------------------------------------------------------------------
  { id: 'london-calais', name: 'London to Calais', kind: 'sea', owner: 'crown', danger: 0.55, from: 'london', to: 'calais', hazard: 'pirates',
    pts: [[-0.08, 51.5], [0.35, 51.47], [0.7, 51.48], [1.05, 51.5], [1.5, 51.42], [1.72, 51.2], [1.85, 50.97]] },
  { id: 'dover-calais', name: 'Dover to Calais', kind: 'sea', owner: 'crown', danger: 0.4, from: 'dover', to: 'calais', hazard: 'customs',
    pts: [[1.31, 51.13], [1.42, 51.08], [1.58, 51.02], [1.74, 50.98], [1.855, 50.955]] },
  { id: 'boston-bruges', name: 'Boston to Bruges', kind: 'sea', owner: 'player', danger: 0.28, from: 'boston', to: 'bruges',
    pts: [[-0.02, 52.97], [0.12, 52.9], [0.3, 52.93], [0.55, 53.05], [1.1, 53.1], [1.7, 52.95], [2.1, 52.6], [2.6, 51.7], [3.05, 51.45], [3.22, 51.28], [3.225, 51.21]] },
  { id: 'hull-bruges', name: 'Hull to Bruges', kind: 'sea', owner: 'foreign', danger: 0.32, from: 'hull', to: 'bruges',
    pts: [[-0.33, 53.74], [-0.1, 53.66], [0.5, 53.5], [1.4, 53.15], [2.2, 52.5], [2.8, 51.75], [3.15, 51.4], [3.225, 51.21]] },
  { id: 'southampton-bordeaux', name: 'Southampton to Bordeaux', kind: 'sea', owner: 'foreign', danger: 0.48, from: 'southampton', to: 'bordeaux', hazard: 'weather',
    pts: [[-1.4, 50.9], [-1.55, 50.55], [-2.4, 49.7], [-3.2, 48.6], [-3.4, 47.4], [-2.6, 46.1], [-1.6, 45.15], [-0.9, 44.92], [-0.58, 44.84]] },
  { id: 'bristol-bordeaux', name: 'Bristol to Bordeaux', kind: 'sea', owner: 'foreign', danger: 0.45, from: 'bristol', to: 'bordeaux', hazard: 'weather',
    pts: [[-2.59, 51.45], [-3.6, 50.7], [-4.5, 50.4], [-4.2, 49.9], [-3.6, 49.2], [-3.0, 48.5], [-2.2, 47.8], [-1.7, 47.0], [-1.4, 46.2], [-1.05, 45.52], [-0.58, 44.84]] },
  { id: 'newcastle-bruges', name: 'Newcastle to Bruges', kind: 'sea', owner: 'foreign', danger: 0.42, from: 'newcastle', to: 'bruges', hazard: 'weather',
    pts: [[-1.61, 54.97], [-1.15, 55.02], [-0.3, 54.85], [0.7, 54.4], [1.7, 53.6], [2.5, 52.6], [3.0, 51.85], [3.2, 51.4], [3.225, 51.21]] },
  { id: 'norwich-bruges', name: 'Norwich to Bruges', kind: 'sea', owner: 'rival', danger: 0.3, from: 'norwich', to: 'bruges',
    pts: [[1.3, 52.63], [1.55, 52.62], [1.73, 52.61], [2.15, 52.35], [2.7, 51.8], [3.1, 51.4], [3.225, 51.21]] },
  { id: 'ipswich-antwerp', name: 'Ipswich to Antwerp', kind: 'sea', owner: 'foreign', danger: 0.34, from: 'ipswich', to: 'antwerp',
    pts: [[1.15, 52.06], [1.45, 51.92], [1.9, 51.65], [2.6, 51.48], [3.5, 51.38], [4.05, 51.3], [4.4, 51.22]] },
  { id: 'southampton-rouen', name: 'Southampton to Rouen', kind: 'sea', owner: 'foreign', danger: 0.7, from: 'southampton', to: 'rouen', hazard: 'pirates',
    pts: [[-1.4, 50.9], [-1.3, 50.8], [-1.1, 50.72], [-0.7, 50.55], [-0.1, 50.1], [0.1, 49.6], [0.12, 49.47], [1.09, 49.44]] },

  // ---- extra life --------------------------------------------------------------------------
  { id: 'boston-sluys', name: 'Boston to Sluys', kind: 'sea', owner: 'player', danger: 0.3, from: 'boston', to: 'sluys',
    pts: [[-0.02, 52.97], [0.12, 52.9], [0.3, 52.93], [0.55, 53.05], [1.1, 53.1], [1.7, 52.95], [2.1, 52.6], [2.35, 52.1], [2.6, 51.7], [3.05, 51.45], [3.37, 51.37], [3.385, 51.31]] },
  { id: 'hull-dordrecht', name: 'Hull to Dordrecht', kind: 'sea', owner: 'foreign', danger: 0.35, from: 'hull', to: 'dordrecht',
    pts: [[-0.33, 53.74], [-0.1, 53.66], [0.2, 53.58], [0.8, 53.45], [1.8, 53.2], [3.0, 52.6], [3.8, 52.1], [4.1, 51.98], [4.48, 51.9], [4.67, 51.81]] },
  { id: 'lynn-bruges', name: 'Lynn to Bruges', kind: 'sea', owner: 'rival', danger: 0.3, from: 'lynn', to: 'bruges',
    pts: [[0.4, 52.76], [0.35, 52.85], [0.55, 53.0], [1.1, 53.05], [1.75, 52.85], [2.4, 52.2], [2.9, 51.55], [3.22, 51.28], [3.225, 51.21]] },
  { id: 'fenby-run', name: "Fenby's quiet run", kind: 'sea', owner: 'rival', danger: 0.6, from: 'boston', to: 'calais', hazard: 'customs',
    pts: [[-0.02, 52.97], [0.12, 52.9], [0.3, 52.93], [0.6, 52.98], [1.0, 52.99], [1.5, 52.97], [1.8, 52.7], [1.9, 52.3], [2.3, 51.3], [2.38, 51.07]] },

  // ---- rivers ------------------------------------------------------------------------------
  { id: 'thames', name: 'The Thames', kind: 'river', owner: 'crown', danger: 0.15, from: 'london', to: 'gravesend',
    pts: [[-0.1, 51.51], [0.02, 51.505], [0.18, 51.49], [0.35, 51.46], [0.52, 51.45], [0.78, 51.48]] },
  { id: 'humber-trent', name: 'Humber and Trent', kind: 'river', owner: 'crown', danger: 0.18, from: 'hull', to: 'nottingham',
    pts: [[-0.33, 53.745], [-0.52, 53.73], [-0.72, 53.71], [-0.88, 53.62], [-0.92, 53.48], [-0.98, 53.28], [-1.08, 53.1], [-1.15, 52.95]] },

  // ---- land roads --------------------------------------------------------------------------
  { id: 'wool-road', name: 'The Wool Road (Lincoln-Boston)', kind: 'road', owner: 'player', danger: 0.2, from: 'lincoln', to: 'boston', grade: 'highway',
    pts: [[-0.54, 53.23], [-0.4, 53.18], [-0.28, 53.13], [-0.15, 53.05], [-0.025, 52.975]] },
  { id: 'great-north-road', name: 'The Great North Road', kind: 'road', owner: 'crown', danger: 0.35, from: 'london', to: 'york', grade: 'king',
    pts: [[-0.1, 51.51], [-0.2, 51.75], [-0.27, 52.08], [-0.3, 52.35], [-0.47, 52.57], [-0.64, 52.91], [-0.8, 53.1], [-0.95, 53.35], [-1.1, 53.6], [-1.08, 53.96]] },
  { id: 'watling-dover', name: 'Canterbury to Dover', kind: 'road', owner: 'crown', danger: 0.22, from: 'canterbury', to: 'dover', grade: 'king',
    pts: [[1.08, 51.28], [1.16, 51.24], [1.23, 51.18], [1.31, 51.13]] },
  { id: 'lincoln-nottingham', name: 'Lincoln to Nottingham', kind: 'road', owner: 'rival', danger: 0.25, from: 'lincoln', to: 'nottingham', grade: 'track',
    pts: [[-0.54, 53.23], [-0.72, 53.12], [-0.92, 53.02], [-1.15, 52.95]] },
  { id: 'norwich-yarmouth', name: 'Norwich to Yarmouth', kind: 'road', owner: 'rival', danger: 0.18, from: 'norwich', to: 'yarmouth', grade: 'track',
    pts: [[1.3, 52.63], [1.5, 52.62], [1.73, 52.61]] },
  { id: 'pack-wolds', name: 'The Wolds pack-road', kind: 'road', owner: 'player', danger: 0.22, from: 'lincoln', to: 'york', grade: 'track',
    pts: [[-0.54, 53.23], [-0.7, 53.4], [-0.9, 53.55], [-1.0, 53.75], [-1.08, 53.96]] },
];
