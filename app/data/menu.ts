export type Product = {
  id: number;
  name: string;
  price: number;
  category: string;
};

export const menu: {
  category: string;
  items: Product[];
}[] = [
  {
    category: "Entradas Quentes",
    items: [
      { id: 1, name: "Bolinho de Salmão (6 un)", price: 25.5, category: "entradas" },
      { id: 2, name: "Bolinho de Atum (6 un)", price: 25.5, category: "entradas" },
      { id: 3, name: "Edamame (150g)", price: 30.5, category: "entradas" },
      { id: 4, name: "Guioza Suíno (6 un)", price: 25.5, category: "entradas" },
      { id: 5, name: "Guioza de Vegetais (6 un)", price: 24.5, category: "entradas" },
      { id: 6, name: "Isca de Tilápia Empanada (6 un)", price: 19.5, category: "entradas" },
      { id: 7, name: "Harumaki de Legumes (1 un)", price: 11.5, category: "entradas" },
      { id: 8, name: "Harumaki de Camarão (1 un)", price: 13.5, category: "entradas" },
      { id: 9, name: "Harumaki de Queijo (1 un)", price: 12.5, category: "entradas" },
      { id: 10, name: "Patê de Skin (6 un)", price: 25.5, category: "entradas" },
      { id: 11, name: "Camarão Empanado (6 un)", price: 25.5, category: "entradas" },
      { id: 12, name: "Pipoca de Camarão (150g)", price: 49.5, category: "entradas" },
      { id: 13, name: "Camarão Missô (6 un)", price: 49.5, category: "entradas" },
      { id: 14, name: "Camarão Alho & Óleo (150g)", price: 49.5, category: "entradas" },
      { id: 15, name: "Missoshiro", price: 19.5, category: "entradas" },
      { id: 16, name: "Shimeji (150g)", price: 30.5, category: "entradas" },
      { id: 17, name: "Shimeji Tropical (150g)", price: 33.5, category: "entradas" },
      { id: 18, name: "Entradinha Missô", price: 15.5, category: "entradas" },
    ],
  },

  {
    category: "Entradas Frias",
    items: [
      { id: 19, name: "Carpaccio de Salmão", price: 49.5, category: "frio" },
      { id: 20, name: "Carpaccio de Atum", price: 49.5, category: "frio" },
      { id: 21, name: "Carpaccio de Peixe Branco", price: 39.5, category: "frio" },
      { id: 22, name: "Carpaccio de Salmão Trufado", price: 59.5, category: "frio" },
      { id: 23, name: "Carpaccio de Atum Trufado", price: 59.5, category: "frio" },
      { id: 24, name: "Carpaccio Misto Trufado", price: 59.5, category: "frio" },
      { id: 25, name: "Tataki de Salmão (150g)", price: 49.5, category: "frio" },
      { id: 26, name: "Tataki de Atum (150g)", price: 49.5, category: "frio" },
      { id: 27, name: "Tataki Misto (150g)", price: 49.5, category: "frio" },
      { id: 28, name: "Tartar de Salmão (150g)", price: 49.5, category: "frio" },
      { id: 29, name: "Sunomono (150g)", price: 19.5, category: "frio" },
      { id: 30, name: "Ceviche de Peixe Branco (150g)", price: 35.5, category: "frio" },
      { id: 31, name: "Ceviche Misto (150g)", price: 39.5, category: "frio" },
    ],
  },

  {
    category: "Sashimis",
    items: [
      { id: 32, name: "Sashimi de Salmão (6 un)", price: 36.5, category: "sashimi" },
      { id: 33, name: "Sashimi de Atum (6 un)", price: 35.5, category: "sashimi" },
      { id: 34, name: "Sashimi de Peixe Branco (6 un)", price: 25.5, category: "sashimi" },
      { id: 35, name: "Sashimi de Salmão Maçaricado (6 un)", price: 36.5, category: "sashimi" },
      { id: 36, name: "Sashimi de Atum Maçaricado (6 un)", price: 35.5, category: "sashimi" },
      { id: 37, name: "Sashimi de Anchova Defumada (6 un)", price: 35.5, category: "sashimi" },
      { id: 38, name: "Sashimi Toro (6 un)", price: 55.5, category: "sashimi" },
      { id: 39, name: "Sashimi de Salmão Trufado (6 un)", price: 55.5, category: "sashimi" },
      { id: 40, name: "Sashimi Especial do Chef (6 un)", price: 49.5, category: "sashimi" },
      { id: 41, name: "Sashimi Missô (6 un)", price: 49.5, category: "sashimi" },
      { id: 42, name: "Sashimi de Atum Selado (6 un)", price: 49.5, category: "sashimi" },
    ],
  },

  {
    category: "Jyos",
    items: [
      { id: 43, name: "Jyo Philadelphia (dupla)", price: 13.5, category: "jyo" },
      { id: 44, name: "Jyo Maracujá (dupla)", price: 13.5, category: "jyo" },
      { id: 45, name: "Jyo Geleia de Pimenta (dupla)", price: 13.5, category: "jyo" },
      { id: 46, name: "Jyo Anchova Defumada (dupla)", price: 13.5, category: "jyo" },
      { id: 47, name: "Jyo Shake Codorna (dupla)", price: 22.5, category: "jyo" },
      { id: 48, name: "Jyo Teka Codorna (dupla)", price: 22.5, category: "jyo" },
      { id: 49, name: "Jyo de Queijo Coalho (dupla)", price: 22.5, category: "jyo" },
      { id: 50, name: "Jyo Especial Missô", price: 22.5, category: "jyo" },
      { id: 51, name: "Jyo de Salmão Trufado", price: 22.5, category: "jyo" },
    ],
  },

  {
    category: "Niguiris",
    items: [
      { id: 52, name: "Niguiri de Salmão (dupla)", price: 12.5, category: "niguiri" },
      { id: 53, name: "Niguiri de Salmão Maçaricado (dupla)", price: 12.5, category: "niguiri" },
      { id: 54, name: "Niguiri de Atum (dupla)", price: 12.5, category: "niguiri" },
      { id: 55, name: "Niguiri de Atum Maçaricado (dupla)", price: 12.5, category: "niguiri" },
      { id: 56, name: "Niguiri de Camarão (dupla)", price: 12.5, category: "niguiri" },
      { id: 57, name: "Niguiri de Anchova (dupla)", price: 12.5, category: "niguiri" },
      { id: 58, name: "Niguiri de Peixe Branco (dupla)", price: 10.5, category: "niguiri" },
      { id: 59, name: "Niguiri Skin (dupla)", price: 8.5, category: "niguiri" },
      { id: 60, name: "Niguiri Kani (dupla)", price: 8.5, category: "niguiri" },
      { id: 61, name: "Niguiri Salmão Trufado (dupla)", price: 22.5, category: "niguiri" },
      { id: 62, name: "Niguiri Camarão Trufado (dupla)", price: 22.5, category: "niguiri" },
    ],
  },

  {
    category: "Hot Rolls",
    items: [
      { id: 63, name: "Hot Philadelphia (6 un)", price: 19.5, category: "hot" },
      { id: 64, name: "Hot Skin (6 un)", price: 19.5, category: "hot" },
      { id: 65, name: "Hot Poró (5 un)", price: 19.5, category: "hot" },
      { id: 66, name: "Hot Couve (6 un)", price: 19.5, category: "hot" },
      { id: 67, name: "Hot Camarão (6 un)", price: 19.5, category: "hot" },
      { id: 68, name: "Hot Especial (5 un)", price: 19.5, category: "hot" },
      { id: 69, name: "Super Hot", price: 39.5, category: "hot" },
    ],
  },

  {
    category: "Temakis",
    items: [
      { id: 70, name: "Temaki Salmão", price: 31.5, category: "temaki" },
      { id: 71, name: "Temaki Salmão Cream Cheese", price: 31.5, category: "temaki" },
      { id: 72, name: "Temaki Salmão Cream Cheese e Cebolinha", price: 32.5, category: "temaki" },
      { id: 73, name: "Temaki Salmão Cream Cheese e Alho Poró", price: 33.5, category: "temaki" },
      { id: 74, name: "Temaki Camarão Cream Cheese", price: 31.5, category: "temaki" },
      { id: 75, name: "Temaki Camarão Cream Cheese e Cebolinha", price: 32.5, category: "temaki" },
      { id: 76, name: "Temaki Camarão Cream Cheese e Alho Poró", price: 33.5, category: "temaki" },
      { id: 77, name: "Temaki Atum", price: 31.5, category: "temaki" },
      { id: 78, name: "Temaki Atum Cream Cheese e Cebolinha", price: 33.5, category: "temaki" },
      { id: 79, name: "Temaki Anchova Defumada Cream Cheese e Cebolinha", price: 33.5, category: "temaki" },
      { id: 80, name: "Temaki Peixe Branco Cream Cheese e Cebolinha", price: 29.5, category: "temaki" },
      { id: 81, name: "Temaki Kani Cream Cheese e Cebolinha", price: 24.5, category: "temaki" },
      { id: 82, name: "Temaki Skin Cream Cheese e Cebolinha", price: 24.5, category: "temaki" },
      { id: 83, name: "Temaki Salmão e Camarão Cream Cheese e Cebolinha", price: 33.5, category: "temaki" },
      { id: 84, name: "Temaki Missô de Salmão (com arroz)", price: 52.5, category: "temaki" },
      { id: 85, name: "Temaki Missô de Salmão (sem arroz)", price: 59.5, category: "temaki" },
      { id: 86, name: "Temaki Missô de Camarão (com arroz)", price: 52.5, category: "temaki" },
      { id: 87, name: "Temaki Missô de Camarão (sem arroz)", price: 59.5, category: "temaki" },
    ],
  },

  {
    category: "Yakissoba",
    items: [
      { id: 88, name: "Yakissoba de Legumes", price: 32.5, category: "yakissoba" },
      { id: 89, name: "Yakissoba de Frango", price: 39.5, category: "yakissoba" },
      { id: 90, name: "Yakissoba de Carne", price: 42.5, category: "yakissoba" },
      { id: 91, name: "Yakissoba Misto", price: 42.5, category: "yakissoba" },
      { id: 92, name: "Yakissoba de Camarão", price: 49.5, category: "yakissoba" },
    ],
  },

  {
    category: "Executivos",
    items: [
      { id: 93, name: "Executivo de Atum Selado", price: 55.5, category: "executivo" },
      { id: 94, name: "Executivo Camarão Empanado", price: 54.5, category: "executivo" },
      { id: 95, name: "Executivo Salmão Maracujá", price: 55.5, category: "executivo" },
      { id: 96, name: "Executivo de Tilápia", price: 42.5, category: "executivo" },
    ],
  },

  {
    category: "Pokes",
    items: [
      { id: 97, name: "Poke de Ceviche", price: 42.5, category: "poke" },
      { id: 98, name: "Poke de Tilápia Empanada", price: 42.5, category: "poke" },
      { id: 99, name: "Poke de Salmão Fresco", price: 52.5, category: "poke" },
      { id: 100, name: "Poke de Salmão Maçaricado", price: 53.5, category: "poke" },
      { id: 101, name: "Poke de Shimeji na Manteiga", price: 42.5, category: "poke" },
      { id: 102, name: "Poke de Camarão Fresco", price: 49.5, category: "poke" },
      { id: 103, name: "Poke de Camarão Empanado", price: 52.5, category: "poke" },
      { id: 104, name: "Poke de Atum Fresco", price: 52.5, category: "poke" },
      { id: 105, name: "Poke de Atum Maçaricado", price: 53.5, category: "poke" },
      { id: 106, name: "Poke de Anchova Defumada", price: 52.5, category: "poke" },
      { id: 107, name: "Poke de Frango Grelhado", price: 35.5, category: "poke" },
      { id: 108, name: "Poke de Frango Empanado", price: 39.5, category: "poke" },
    ],
  },

  {
    category: "Combinados Missô",
    items: [
      { id: 109, name: "Combinado Missô 01 (12 peças + 1 Temaki)", price: 64.5, category: "combinado" },
      { id: 110, name: "Combinado Missô 02 (20 peças)", price: 68.5, category: "combinado" },
      { id: 111, name: "Combinado Missô 03 (22 peças)", price: 66.5, category: "combinado" },
      { id: 112, name: "Combinado Missô 04 (17 peças)", price: 64.5, category: "combinado" },
      { id: 113, name: "Combinado Missô 05 (18 peças)", price: 99.5, category: "combinado" },
      { id: 114, name: "Combinado Missô 06 (20 peças trufado)", price: 110.5, category: "combinado" },
      { id: 115, name: "Combinado Missô 07 (20 peças)", price: 68.5, category: "combinado" },
      { id: 116, name: "Combinado Missô 08 (21 peças)", price: 94.5, category: "combinado" },
    ],
  },

  {
    category: "Combinados Parks",
    items: [
      { id: 117, name: "Park Jade (80 peças)", price: 239.5, category: "combinado" },
      { id: 118, name: "Park Living (40 peças)", price: 129.5, category: "combinado" },
      { id: 119, name: "Park Prime (90 peças)", price: 234.5, category: "combinado" },
      { id: 120, name: "Park Vista (40 peças)", price: 124.5, category: "combinado" },
      { id: 121, name: "Park Villagio (40 peças)", price: 124.5, category: "combinado" },
      { id: 122, name: "Park Elegance (18 peças)", price: 54.5, category: "combinado" },
      { id: 123, name: "Park Studio (20 peças)", price: 54.5, category: "combinado" },
      { id: 124, name: "Park Venice (41 peças)", price: 129.5, category: "combinado" },
    ],
  },

  {
    category: "Sobremesas",
    items: [
      { id: 125, name: "Harumakis Doces", price: 12.5, category: "sobremesa" },
      { id: 126, name: "Jyos de Goiabada (6 un)", price: 16.5, category: "sobremesa" },
      { id: 127, name: "Hot Nana com Sorvete (6 un)", price: 24.5, category: "sobremesa" },
      { id: 128, name: "Hot Nana com Avelã (6 un)", price: 20.5, category: "sobremesa" },
      { id: 129, name: "Brownie com Sorvete", price: 29.9, category: "sobremesa" },
    ],
  },

  {
    category: "Bebidas",
    items: [
      { id: 130, name: "Água sem gás", price: 6.0, category: "bebida" },
      { id: 131, name: "Água com gás", price: 7.0, category: "bebida" },
      { id: 132, name: "Refrigerante em lata", price: 8.5, category: "bebida" },
      { id: 133, name: "Suco da fruta", price: 14.5, category: "bebida" },
      { id: 134, name: "Cerveja long neck", price: 13.5, category: "bebida" },
      { id: 135, name: "Caipirinha", price: 30.0, category: "drink" },
      { id: 136, name: "Caipifrutas", price: 34.5, category: "drink" },
      { id: 137, name: "Mojito", price: 34.5, category: "drink" },
      { id: 138, name: "Gin Tônica", price: 34.5, category: "drink" },
      { id: 139, name: "Gin com Frutas", price: 39.5, category: "drink" },
      { id: 140, name: "Sakê com Frutas", price: 39.5, category: "drink" },
      { id: 141, name: "Soda Italiana", price: 19.5, category: "drink" },
      { id: 142, name: "Soda Italiana com Vodka", price: 34.5, category: "drink" },
      { id: 143, name: "Vodka Importada (dose)", price: 24.5, category: "destilado" },
      { id: 144, name: "Sakê (dose)", price: 27.5, category: "destilado" },
      { id: 145, name: "Garrafa de Sakê", price: 99.5, category: "destilado" },
      { id: 146, name: "Whisky 8 anos (dose)", price: 24.5, category: "destilado" },
      { id: 147, name: "Whisky 12 anos (dose)", price: 39.0, category: "destilado" },
    ],
  },
];