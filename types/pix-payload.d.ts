declare module "pix-payload" {
  export default class Pix {
    constructor(config: {
      key: string;
      name: string;
      city: string;
      amount: string;
    });
    payload(): string;
  }
}
