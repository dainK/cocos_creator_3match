import { _decorator, CCInteger, CCString, Component, EventTouch, Node, Vec2, Vec3 } from 'cc';
import { GameManager } from './GameManager';
import { GameGlobal } from './GameGlobal';
const { ccclass, property } = _decorator;

@ccclass('Block')
export class Block extends Component {
    @property(CCString) blockId : string = "";
    private isDragging: boolean = false;
    row : number = -1;
    col : number = -1;

    changeMethode : any;
    touchStartPos: Vec2 = new Vec2(0, 0);
    
    public startEvent(func : (any)) :void {
        this.changeMethode = func;
        this.node.on(Node.EventType.TOUCH_START, this.onTouchStart, this);
        this.node.on(Node.EventType.TOUCH_MOVE, this.onTouchMove, this);
        this.node.on(Node.EventType.TOUCH_END, this.onTouchEnd, this);
        this.node.on(Node.EventType.TOUCH_CANCEL, this.onTouchCancel, this);
    }

    public destroyEvent() : void {
        this.node.off(Node.EventType.TOUCH_START, this.onTouchStart, this);
        this.node.off(Node.EventType.TOUCH_MOVE, this.onTouchMove, this);
        this.node.off(Node.EventType.TOUCH_END, this.onTouchEnd, this);
        this.node.off(Node.EventType.TOUCH_CANCEL, this.onTouchCancel, this);
    }

    public getID() : string {
        return this.blockId;
    }

    
    onTouchStart(event: EventTouch) {
        this.isDragging = true;
        this.touchStartPos = event.getUILocation();
    }
    
    onTouchMove(event: EventTouch) {
        if(!this.isDragging) 
            return;


        let loc = event.getUILocation();
        let deltaX = loc.x - this.touchStartPos.x;
        let deltaY = loc.y - this.touchStartPos.y;
        
        let absX = Math.abs(deltaX);
        let absY = Math.abs(deltaY);

        if(absX > 20 || absY > 20) {
            console.log('로그',this.row,this.col,deltaX,deltaY);
            if (absX > absY) {
                // 가로 이동
                if(deltaX > 0 && this.col < GameGlobal.col -1){
                    // 오른쪽
                    this.changeMethode(this.row,this.col,this.row,this.col+1);
                }
                else if( deltaX < 0  && this.col > 0) {
                    // 왼쪽
                    this.changeMethode(this.row,this.col,this.row,this.col-1);
                }
            } else {
                // 세로 이동
                if(deltaY > 0 && this.row < GameGlobal.row -1){
                    // 위
                    this.changeMethode(this.row,this.col,this.row+1,this.col);
                }
                else if( deltaY < 0  && this.row > 0) {               
                    // 아래
                    this.changeMethode(this.row,this.col,this.row-1,this.col);
                 }
            }
            this.isDragging = false;
        }
    }
    
    onTouchEnd(event: EventTouch) {
        this.isDragging = false;
    }

    onTouchCancel(event: EventTouch) {
        this.isDragging = false;
    }

    public setPositionInfo(row:number,col:number) : void {
        this.row = row;
        this.col = col;
        this.node.name = 'block_' + row.toString() + '_' + col.toString();
    }




}


