export class PlayerModel {
  static index = 0;
  constructor(name) {
    this.name = name;
    this.index = PlayerModel.index++;
    this.error = false;
    this.errorText = 'Something went wrong';
  }
}
