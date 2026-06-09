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
      { id: 7, name: "Entradinha Missô", price: 15.5, category: "entradas" },
      { id: 8, name: "Camarão Empanado (6 un)", price: 25.5, category: "entradas" },
      { id: 9, name: "Pipoca de Camarão (150g)", price: 49.5, category: "entradas" },
      { id: 10, name: "Camarão Missô", price: 49.5, category: "entradas" },
      { id: 11, name: "Camarão Alho & Óleo (150g)", price: 49.5, category: "entradas" },
      { id: 12, name: "Missoshiro", price: 19.5, category: "entradas" },
      { id: 13, name: "Shimeji (150g)", price: 30.5, category: "entradas" },
      { id: 14, name: "Shimeji Tropical (150g)", price: 33.5, category: "entradas" },
      { id: 15, name: "Harumaki de Legumes", price: 11.5, category: "entradas" },
      { id: 16, name: "Harumaki de Camarão", price: 13.5, category: "entradas" },
      { id: 17, name: "Harumaki de Queijo", price: 12.5, category: "entradas" },
    ],
  },

  {
    category: "Entradas Frias",
    items: [
      { id: 18, name: "Carpaccio de Salmão", price: 49.5, category: "frio" },
      { id: 19, name: "Carpaccio de Atum", price: 49.5, category: "frio" },
      { id: 20, name: "Carpaccio de Peixe Branco", price: 39.5, category: "frio" },
      { id: 21, name: "Carpaccio Misto Trufado", price: 59.5, category: "frio" },
      { id: 22, name: "Tataki de Salmão", price: 49.5, category: "frio" },
      { id: 23, name: "Tataki de Atum", price: 49.5, category: "frio" },
      { id: 24, name: "Ceviche de Peixe Branco", price: 35.5, category: "frio" },
      { id: 25, name: "Ceviche Misto", price: 39.5, category: "frio" },
      { id: 26, name: "Tartar de Salmão", price: 49.5, category: "frio" },
      { id: 27, name: "Sunomono", price: 19.5, category: "frio" },
    ],
  },

  {
    category: "Sashimis",
    items: [
      { id: 28, name: "Sashimi de Salmão (6 un)", price: 36.5, category: "sashimi" },
      { id: 29, name: "Sashimi de Atum (6 un)", price: 35.5, category: "sashimi" },
      { id: 30, name: "Sashimi de Peixe Branco", price: 25.5, category: "sashimi" },
      { id: 31, name: "Sashimi Toro", price: 55.5, category: "sashimi" },
    ],
  },

  {
    category: "Niguiris",
    items: [
      { id: 32, name: "Salmão", price: 12.5, category: "niguiri" },
      { id: 33, name: "Atum", price: 12.5, category: "niguiri" },
      { id: 34, name: "Camarão", price: 12.5, category: "niguiri" },
      { id: 35, name: "Skin", price: 8.5, category: "niguiri" },
      { id: 36, name: "Kani", price: 8.5, category: "niguiri" },
    ],
  },

  {
    category: "Hot Rolls",
    items: [
      { id: 37, name: "Hot Philadelphia", price: 19.5, category: "hot" },
      { id: 38, name: "Hot Skin", price: 19.5, category: "hot" },
      { id: 39, name: "Hot Poró", price: 19.5, category: "hot" },
      { id: 40, name: "Hot Camarão", price: 19.5, category: "hot" },
      { id: 41, name: "Super Hot", price: 39.5, category: "hot" },
    ],
  },

  {
    category: "Temakis",
    items: [
      { id: 42, name: "Temaki Salmão", price: 31.5, category: "temaki" },
      { id: 43, name: "Temaki Salmão Cream Cheese", price: 31.5, category: "temaki" },
      { id: 44, name: "Temaki Camarão", price: 31.5, category: "temaki" },
      { id: 45, name: "Temaki Atum", price: 31.5, category: "temaki" },
    ],
  },

  {
    category: "Yakissoba",
    items: [
      { id: 46, name: "Yakissoba de Legumes", price: 32.5, category: "yakissoba" },
      { id: 47, name: "Yakissoba de Frango", price: 39.5, category: "yakissoba" },
      { id: 48, name: "Yakissoba de Carne", price: 42.5, category: "yakissoba" },
      { id: 49, name: "Yakissoba de Camarão", price: 49.5, category: "yakissoba" },
    ],
  },

  {
    category: "Sobremesas",
    items: [
      { id: 50, name: "Harumaki Doce", price: 12.5, category: "sobremesa" },
      { id: 51, name: "Hot Nana com Avelã", price: 20.5, category: "sobremesa" },
      { id: 52, name: "Brownie com Sorvete", price: 29.9, category: "sobremesa" },
    ],
  },
];