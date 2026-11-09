// Bibliothèque de départ : [nom, étiquettes, protéines g, glucides g, lipides g, ingrédients, minutes]
// Valeurs pour une portion, estimées. Tout est modifiable dans l'app (Repas > Recettes).
type Row = [string, string[], number, number, number, string[], number]

const PDJ = 'petit-dejeuner'
const DEJ = 'dejeuner'
const DIN = 'diner'
const COL = 'collation'
const RAP = 'rapide'
const VEG = 'vegetarien'

export const RECIPES: Row[] = [
  // Petit-déjeuner
  ['Porridge avoine et banane', [PDJ, RAP, VEG], 18, 85, 9, ['flocons d’avoine', 'lait', 'banane'], 10],
  ['Skyr, granola et fruits rouges', [PDJ, COL, RAP, VEG], 22, 45, 8, ['skyr', 'granola', 'fruits rouges'], 5],
  ['Omelette 3 œufs et pain complet', [PDJ, RAP, VEG], 26, 30, 17, ['œufs', 'pain complet', 'ciboulette'], 10],
  ['Tartines beurre de cacahuète et banane', [PDJ, RAP, VEG], 14, 60, 17, ['pain complet', 'beurre de cacahuète', 'banane'], 5],
  ['Pancakes avoine et fromage blanc', [PDJ, VEG], 28, 55, 8, ['flocons d’avoine', 'œufs', 'fromage blanc', 'myrtilles'], 20],
  ['Tartine œufs brouillés et avocat', [PDJ, RAP, VEG], 20, 32, 22, ['pain complet', 'œufs', 'avocat'], 10],
  ['Fromage blanc, miel et noix', [PDJ, COL, RAP, VEG], 20, 30, 12, ['fromage blanc', 'miel', 'noix'], 3],
  ['Smoothie protéiné banane-avoine', [PDJ, COL, RAP, VEG], 32, 55, 7, ['lait', 'whey', 'banane', 'flocons d’avoine'], 5],

  // Déjeuner et dîner
  ['Poulet, riz et brocolis', [DEJ, DIN], 42, 65, 9, ['poulet', 'riz', 'brocoli', 'huile d’olive'], 25],
  ['Saumon, patate douce et haricots verts', [DEJ, DIN], 34, 45, 20, ['saumon', 'patate douce', 'haricots verts'], 30],
  ['Pâtes bolognaise maison', [DEJ, DIN], 35, 80, 15, ['pâtes', 'bœuf haché', 'sauce tomate', 'oignon'], 30],
  ['Chili con carne et riz', [DEJ, DIN], 35, 55, 14, ['bœuf haché', 'haricots rouges', 'riz', 'tomate', 'poivron'], 40],
  ['Dahl de lentilles corail', [DEJ, DIN, VEG], 22, 70, 12, ['lentilles corail', 'lait de coco', 'riz', 'épinards'], 30],
  ['Curry de pois chiches', [DEJ, DIN, VEG], 18, 65, 16, ['pois chiches', 'lait de coco', 'riz', 'tomate'], 30],
  ['Omelette aux champignons et salade', [DIN, RAP, VEG], 26, 8, 22, ['œufs', 'champignons', 'salade', 'emmental'], 15],
  ['Poke bowl au thon', [DEJ, DIN, RAP], 35, 70, 14, ['thon', 'riz', 'avocat', 'concombre', 'edamame'], 15],
  ['Wrap poulet et crudités', [DEJ, RAP], 32, 45, 14, ['tortilla', 'poulet', 'salade', 'tomate', 'fromage blanc'], 10],
  ['Salade niçoise', [DEJ, DIN], 30, 25, 20, ['thon', 'œufs', 'pomme de terre', 'haricots verts', 'tomate', 'olives', 'anchois'], 20],
  ['Steak haché, purée et haricots verts', [DEJ, DIN], 32, 40, 18, ['bœuf haché', 'pomme de terre', 'lait', 'haricots verts'], 25],
  ['Cabillaud, riz et courgettes', [DEJ, DIN], 35, 55, 7, ['cabillaud', 'riz', 'courgette', 'citron'], 25],
  ['Quiche aux poireaux (une part)', [DIN, VEG], 16, 30, 24, ['pâte brisée', 'poireaux', 'œufs', 'crème', 'emmental'], 50],
  ['Ratatouille, quinoa et œuf', [DEJ, DIN, VEG], 18, 45, 14, ['courgette', 'aubergine', 'poivron', 'tomate', 'quinoa', 'œufs'], 40],
  ['Gratin de pâtes au jambon', [DIN], 32, 70, 20, ['pâtes', 'jambon', 'lait', 'emmental'], 35],
  ['Poulet basquaise et riz', [DEJ, DIN], 38, 60, 12, ['poulet', 'poivron', 'tomate', 'oignon', 'riz'], 45],
  ['Soupe de légumes et tartine au fromage', [DIN, VEG], 16, 40, 14, ['carotte', 'poireau', 'pomme de terre', 'pain complet', 'emmental'], 30],
  ['Taboulé au poulet', [DEJ, RAP], 32, 60, 12, ['semoule', 'poulet', 'tomate', 'concombre', 'menthe', 'citron'], 20],
  ['Croque-monsieur et salade', [DIN, RAP], 28, 40, 22, ['pain de mie', 'jambon', 'emmental', 'salade'], 15],
  ['Galette complète au sarrasin', [DIN], 24, 35, 20, ['farine de sarrasin', 'jambon', 'œufs', 'emmental'], 20],
  ['Tofu sauté aux légumes et nouilles', [DEJ, DIN, VEG], 26, 60, 14, ['tofu', 'nouilles', 'brocoli', 'carotte', 'sauce soja'], 20],
  ['Salade de lentilles, feta et œuf', [DEJ, VEG], 26, 40, 16, ['lentilles', 'feta', 'œufs', 'oignon rouge'], 15],
  ['Hachis parmentier', [DIN], 30, 45, 20, ['bœuf haché', 'pomme de terre', 'lait', 'emmental'], 50],
  ['Saumon, quinoa et épinards', [DEJ, DIN], 36, 42, 22, ['saumon', 'quinoa', 'épinards'], 25],
  ['Escalope de dinde, pâtes complètes et tomates', [DEJ, DIN], 40, 70, 8, ['dinde', 'pâtes complètes', 'tomate'], 20],
  ['Risotto poulet et champignons', [DIN], 34, 75, 14, ['riz', 'poulet', 'champignons', 'parmesan', 'oignon'], 35],
  ['Riz sauté aux œufs et légumes', [DEJ, DIN, RAP, VEG], 20, 65, 14, ['riz', 'œufs', 'petits pois', 'carotte', 'sauce soja'], 15],

  // Collations
  ['Pomme et amandes', [COL, RAP, VEG], 6, 20, 14, ['pomme', 'amandes'], 2],
  ['Skyr et banane', [COL, RAP, VEG], 16, 30, 1, ['skyr', 'banane'], 2],
  ['Tartine thon et fromage frais', [COL, RAP], 20, 25, 6, ['pain complet', 'thon', 'fromage frais'], 5],
  ['Œufs durs et crudités', [COL, VEG], 13, 6, 10, ['œufs', 'carotte', 'concombre'], 12],
  ['Shaker whey et lait', [COL, RAP, VEG], 30, 12, 4, ['whey', 'lait'], 2],
  ['Houmous et bâtonnets de légumes', [COL, VEG], 8, 20, 14, ['pois chiches', 'tahini', 'carotte', 'concombre'], 10],
  ['Barre maison avoine-chocolat', [COL, VEG], 8, 35, 12, ['flocons d’avoine', 'chocolat noir', 'miel', 'beurre de cacahuète'], 15],
]
