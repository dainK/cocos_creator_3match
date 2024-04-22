import { _decorator, Component, Node } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('GameGlobal')
export class GameGlobal extends Component {
    static col : number = 7;
    static row : number = 9;
    static offset : number = 1;
    static size :  number = 85;
}

export enum MatchType {
    None,
    Match3,
    Both3,
    Vertical4,
    Horizontal4,
    Both4
}

export enum State {
    None,
    Start,
    Idle,
    CheckEnable,
    Reset,
    Change,
    Revert,
    CurrentCheckMatch,
    CheckMatch,
    RemoveBlock,
    MoveDown,
    TimeOver
}
