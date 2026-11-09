// 食材表：基础 6 味 + 高阶 14 味（高阶图集 16 格中 item2_shrimp / item2_cured_meat 按红线弃用）
// 合成链 3 条：葱×2→葱油、汤×2→高汤、蛋×2→蛋丝；其余高阶料只在云市买（稀有货）
const GOODS = [
  { id: 'noodle', name: '生面', atlas: 'ui_items_atlas', frame: 'item_noodle_raw', price: 6 },
  { id: 'soup', name: '汤底', atlas: 'ui_items_atlas', frame: 'item_bowl', price: 5 },
  { id: 'scallion', name: '葱', atlas: 'ui_items_atlas', frame: 'item_scallion', price: 3 },
  { id: 'egg', name: '蛋', atlas: 'ui_items_atlas', frame: 'item_egg', price: 5 },
  { id: 'greens', name: '青菜', atlas: 'ui_items_atlas', frame: 'item_greens', price: 4 },
  { id: 'fire', name: '柴火', atlas: 'ui_items_atlas', frame: 'item_fire', price: 4 },

  { id: 'scallion_oil', name: '葱油', atlas: 'ui_items2_atlas', frame: 'item2_scallion_oil', price: 14, tier: 2 },
  { id: 'bone_broth', name: '高汤', atlas: 'ui_items2_atlas', frame: 'item2_bone_broth', price: 16, tier: 2 },
  { id: 'egg_shred', name: '蛋丝', atlas: 'ui_items2_atlas', frame: 'item2_egg_shred', price: 12, tier: 2 },
  { id: 'seaweed', name: '海苔丝', atlas: 'ui_items2_atlas', frame: 'item2_seaweed', price: 10, tier: 2 },
  { id: 'snow_mushroom', name: '白玉菇', atlas: 'ui_items2_atlas', frame: 'item2_snow_mushroom', price: 18, tier: 2 },
  { id: 'cloud_tea', name: '云雾茶', atlas: 'ui_items2_atlas', frame: 'item2_cloud_tea', price: 24, tier: 2, rare: true },
  { id: 'gold_pill', name: '金丸', atlas: 'ui_items2_atlas', frame: 'item2_gold_pill', price: 20, tier: 2 },
  { id: 'chili_powder', name: '辣粉', atlas: 'ui_items2_atlas', frame: 'item2_chili_powder', price: 9, tier: 2 },
  { id: 'bean_paste', name: '面酱', atlas: 'ui_items2_atlas', frame: 'item2_bean_paste', price: 11, tier: 2 },
  { id: 'sesame', name: '白芝麻', atlas: 'ui_items2_atlas', frame: 'item2_sesame', price: 8, tier: 2 },
  { id: 'osmanthus_honey', name: '桂花蜜', atlas: 'ui_items2_atlas', frame: 'item2_osmanthus_honey', price: 22, tier: 2 },
  { id: 'amber_sugar', name: '琥珀糖', atlas: 'ui_items2_atlas', frame: 'item2_amber_sugar', price: 19, tier: 2, rare: true },
  { id: 'green_pepper', name: '青花椒', atlas: 'ui_items2_atlas', frame: 'item2_green_pepper', price: 15, tier: 2 },
  { id: 'lotus_leaf', name: '干荷叶', atlas: 'ui_items2_atlas', frame: 'item2_lotus_leaf', price: 13, tier: 2 }
];

// 合成：两个同类基础料 → 一味高阶料
const RECIPES = [
  { input: 'scallion', out: 'scallion_oil' },
  { input: 'soup', out: 'bone_broth' },
  { input: 'egg', out: 'egg_shred' }
];

const BASE_IDS = ['noodle', 'soup', 'scallion', 'egg', 'greens', 'fire'];

function byId(id) {
  for (let i = 0; i < GOODS.length; i++) if (GOODS[i].id === id) return GOODS[i];
  return null;
}
function recipeFor(input) {
  for (let i = 0; i < RECIPES.length; i++) if (RECIPES[i].input === input) return RECIPES[i];
  return null;
}

module.exports = { GOODS: GOODS, RECIPES: RECIPES, BASE_IDS: BASE_IDS, byId: byId, recipeFor: recipeFor };
