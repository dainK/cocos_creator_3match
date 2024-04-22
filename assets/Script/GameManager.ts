import { _decorator, CCInteger, Color, Component, instantiate, Label, Node, ProgressBar, Sprite, tween, Vec3 } from 'cc';
import { GameGlobal, MatchType, State } from './GameGlobal';
// import { ItemColorBox } from './ItemColorBox';
const { ccclass, property } = _decorator;
import { Block } from './Block';

@ccclass('GameManager')
export class GameManager extends Component {
    @property(Node) gameGB : Node = null;
    @property(Node) panelButtonPlay : Node = null;
    @property(Node) panelButtonReplay : Node = null;
    @property(Node) blockBox : Node = null;
    @property(Node) blocks : Node[] = [];
    @property(ProgressBar) progressBar : ProgressBar = null;
    @property(Label) timerLabel: Label = null;
    @property(Label) scoreLabel: Label = null;
    @property(Label) yourScoreLabel: Label = null;
    
    runningTweens: any[] = [];

    state : State = State.None;

    blockArr : Node[][] = []; 

    currChangeInfo : any = {
        row1:CCInteger,
        col1:CCInteger,
        row2:CCInteger,
        col2:CCInteger
    };
    
    matches : any[] = [];

    moveDuration : number = 0.5;
    score : number = 0;
    totalTime: number = 60; // 타이머 총 시간 (초)
    currentTime: number = 0; // 현재 경과된 시간 (초)
    interval: number = 0.1; // 타이머 갱신 간격 (초)

    onLoad(): void {
        this.panelButtonPlay.active = true;
        this.panelButtonReplay.active = false;
        this.gameGB.active = false;
    }

    onPlayGame () : void {
        this.panelButtonPlay.active = false;
        this.gameGB.active = true;

        this.currentTime =0;
        this.schedule(this.updateTimer.bind(this), this.interval);
        this.timerLabel.string = "Remaining time : " + this.totalTime.toString();
        
        this.score = 0;
        this.scoreLabel.string = "Score : " + this.score.toString();

        this.changeState(State.Start);
    }

    onReplayGame(): void {
        this.runningTweens.forEach(tweenAction => {
            tweenAction.stop(); // 각 트윈 동작을 중지
        });
        this.runningTweens = []; // 배열 초기화

        this.removeAllBlock();
        this.blockArr = [];

        this.panelButtonReplay.active = false;
        this.gameGB.active = true;

        this.currentTime =0;
        this.schedule(this.updateTimer.bind(this), this.interval);
        this.timerLabel.string = "Remaining time : " + this.totalTime.toString();
        
        this.score = 0;
        this.scoreLabel.string = "Score : " + this.score.toString();

        this.changeState(State.Start);
    }
    
    updateTimer() {
        this.currentTime += this.interval;
        const progress = this.currentTime / this.totalTime;
        this.progressBar.progress = progress; // 프로그레스 바 업데이트

        // 시간을 남은 시간으로 표시
        const remainingTime = Math.max(0, this.totalTime - this.currentTime);
        this.timerLabel.string = "Remaining time : " + remainingTime.toFixed(1);

        // 타이머 종료 체크
        if (this.currentTime >= this.totalTime) {
            this.unschedule(this.updateTimer.bind(this));
            this.finishTimer();
        }
    }

    finishTimer() {
        this.changeState(State.TimeOver);
    }

    changeState( state : State) : void {
        this.state = state;
        console.log('state : ',State[state]);
        switch(state) {
            case State.TimeOver : 
                this.panelButtonReplay.active = true;
                this.gameGB.active = false;
                this.yourScoreLabel.string = "Your score : " + this.score.toString();
                break;

            case State.Start :
                this.createBlockGrid();
                this.changeState(State.CheckMatch);
                break;

            case State.Reset :
                this.removeAllBlock();
                this.changeState(State.MoveDown);
                break;

            case State.Idle : 
                break;

            case State.CheckEnable : 
                if(this.isEnableMatch()) {
                    this.changeState(State.Idle);
                }
                else {
                    this.changeState(State.Reset);
                }
                break;

             case State.CurrentCheckMatch :
                this.matches = this.findAllMatches();
                if(this.matches.length > 0) {
                    this.changeState(State.RemoveBlock);
                }
                else {
                    this.changeState(State.Revert);
                }
                break;

            case State.Revert : 
                this.revertBlock();
                break;

            case State.RemoveBlock : 
                this.removeMatchBlocks();
                this.changeState(State.MoveDown);
                break;

            case State.MoveDown : 
                this.moveDownBlocks();
                break;

            case State.CheckMatch :
                this.matches = this.findAllMatches();
                if(this.matches.length > 0) {
                    this.changeState(State.RemoveBlock);
                }
                else {
                    this.changeState(State.CheckEnable);
                }
                break;
        }
    }

    getBlockPos(row:number,col:number) : Vec3 {
        return new Vec3( (col-(GameGlobal.col/2)) * (GameGlobal.size+GameGlobal.offset) , (row-(GameGlobal.row/2)) * (GameGlobal.size+GameGlobal.offset) , 1);
    }

    printBlock():void{
        for(let row = GameGlobal.row -1; row >= 0; row--) {
            for(let col = 0; col < GameGlobal.col; col++) {
                // let id = !!this.blockArr[row][col] ? this.blockArr[row][col].getComponent(Block).getID() : 'null'; 
                // console.log('Block',row,col,id);
                if(!this.blockArr[row][col]) {
                    console.log('printBlock',row,col,'null');
                }
            }
        }
    }

    createBlockGrid () : void {
        this.blockBox.removeAllChildren();
        for(let row = 0; row < GameGlobal.row; row++) {
            let blockColArr = [];
            for(let col = 0; col < GameGlobal.col; col++) {
                blockColArr.push(this.createRandomBlock(row,col));
            }
            this.blockArr.push(blockColArr);
        }

    }

    createRandomBlock (row,col) : Node {
        let randomIndex = Math.floor(Math.random()*this.blocks.length);
        
        let block : Node = instantiate(this.blocks[randomIndex]);
        block.active = true;
        block!.parent = this.blockBox;
        block.getComponent(Block).startEvent(this.changeBlock.bind(this));
        block.getComponent(Block).setPositionInfo(row,col);
        block.setPosition(this.getBlockPos(row,col));

        return block;
    }

    changeBlock(row1:number,col1:number,row2:number,col2:number): void {
        if(this.state != State.Idle)
            return;

        this.currChangeInfo.row1 = row1;
        this.currChangeInfo.col1 = col1;
        this.currChangeInfo.row2 = row2;
        this.currChangeInfo.col2 = col2;
        let block1 : Node = this.blockArr[row1][col1];
        let block2 : Node = this.blockArr[row2][col2];
        let pos1: Vec3 =  this.getBlockPos(row1,col1);
        let pos2: Vec3 =  this.getBlockPos(row2,col2);
        Promise.all([
            this.moveTweenPromise(block1, pos2,this.moveDuration),
            this.moveTweenPromise(block2, pos1,this.moveDuration)
        ]).then(() => {
            console.log("두 블록의 이동이 모두 완료되었습니다.");
            block2.getComponent(Block).setPositionInfo(row1,col1);
            block1.getComponent(Block).setPositionInfo(row2,col2);
            this.blockArr[row1][col1] = block2;
            this.blockArr[row2][col2] = block1;
            this.changeState(State.CurrentCheckMatch);
        });
    }

    revertBlock() :void {
        let row1 :number = this.currChangeInfo.row1;
        let col1 :number = this.currChangeInfo.col1;
        let row2 :number = this.currChangeInfo.row2;
        let col2 :number = this.currChangeInfo.col2;
        let block1 : Node = this.blockArr[row1][col1];
        let block2 : Node = this.blockArr[row2][col2];
        let pos1: Vec3 =  this.getBlockPos(row1,col1);
        let pos2: Vec3 =  this.getBlockPos(row2,col2);
        Promise.all([
            this.moveTweenPromise(block1, pos2,this.moveDuration),
            this.moveTweenPromise(block2, pos1,this.moveDuration)
        ]).then(() => {
            console.log("되돌리기 완료되었습니다.");
            block2.getComponent(Block).setPositionInfo(row1,col1);
            block1.getComponent(Block).setPositionInfo(row2,col2);
            this.blockArr[row1][col1] = block2;
            this.blockArr[row2][col2] = block1;
            this.changeState(State.Idle);
        });

    }
    
    moveTweenPromise(block: Node, newPosition: Vec3, duration:number): Promise<void> {
        
        return new Promise((resolve) => {
            const tweenAction = tween(block)
                .to(this.moveDuration, { position: newPosition })
                .call(() => {
                    resolve();
                })
                .start();
                
            this.runningTweens.push(tweenAction);
        });
    }

    removeMatchBlocks () : void {
        this.matches.forEach(e=>{
            this.removeBlock(e.row,e.col);
            this.score += 50;
        }) 
        this.scoreLabel.string = "Score : " + this.score.toString();
    }
    
    removeBlock(row:number,col:number ):void{
        let block : Node = this.blockArr[row][col];
        block.getComponent(Block).destroyEvent();
        block.parent = null;
        block.destroy();
        this.blockArr[row][col] = null;
    }

    removeAllBlock() :void {
        for(let row = 0; row < this.blockArr.length; row++) {
            for(let col = 0; col < this.blockArr[row].length; col++) {
                this.removeBlock(row,col);
            }
        }
        // this.blockArr = [];
    }

    checkMatchType(row: number, col: number, idGrid:any[][]): MatchType {
        let horizontalCount = 1;
        let verticalCount = 1;
        let blockId = idGrid[row][col];

        // 가로 방향 확인 (오른쪽)
        for (let c = col + 1; c < GameGlobal.col; c++) {
            if( idGrid[row][c] == blockId) {
                horizontalCount++;
            }
            else {
                break;
            }
        }

        // 가로 방향 확인 (왼쪽)
        for (let c = col - 1; c >= 0; c--) {
            if(idGrid[row][c] == blockId) {
                horizontalCount++;
            }
            else {
                break;
            }
        }

        // 세로 방향 확인 (위)
        for (let r = row + 1; r < GameGlobal.row; r++) {
            if( idGrid[r][col] == blockId) {
                verticalCount++;
            }
            else {
                break;
            }
        }

        // 세로 방향 확인 (아래)
        for (let r = row - 1; r >= 0 ; r--) {
            if( idGrid[r][col] == blockId) {
                verticalCount++;
            }
            else {
                break;
            }
        }
        // 매치 타입과 방향 결정
        if (horizontalCount >= 4 && verticalCount >= 4) {
            return MatchType.Both4;
        } else if (horizontalCount >= 4) {
            return MatchType.Horizontal4;
        } else if (verticalCount >= 4) {
            return MatchType.Vertical4;
        } else if (horizontalCount >= 3 && verticalCount >= 3) {
            return MatchType.Both3;
        } else if (horizontalCount >= 3) {
            return MatchType.Match3;
        } else if (verticalCount >= 3) {
            return MatchType.Match3;
        } else {
            return MatchType.None;
        }
    }

    findAllMatches() {
        // if(this.state != State.CheckMatch && this.state != State.CurrentCheckMatch)
        //     return;
        console.log('findAllMatches',State[this.state]);
        this.printBlock();
        let matchResults = [];
        let idGrid = this.getBlockIDGrid();
        for (let row = 0; row < GameGlobal.row; row++) {
            for (let col = 0; col < GameGlobal.col; col++) {
                // let blockId = this.blockArr[row][col].getComponent(Block).getID();
                let matchType = this.checkMatchType(row, col,idGrid);
                if (matchType !== MatchType.None) {
                    matchResults.push({row, col, matchType});
                }
            }
        }
        console.log('matchResults',matchResults);
        return matchResults;
    }

    getBlockIDGrid() {
        let idGrid :String[][] = [];
        for (let row = 0; row < this.blockArr.length; row++) {
            let idArr :String[] = [];
            for (let col = 0; col < this.blockArr[row].length; col++) {
                let blockId = this.blockArr[row][col].getComponent(Block).getID();
                idArr.push(blockId);
            }
            idGrid.push(idArr);
        }
        return idGrid;
    }

    isEnableMatch() : boolean {
        const idGrid = JSON.parse(JSON.stringify(this.getBlockIDGrid()));
        for (let row = 0; row < GameGlobal.row; row++) {
            for (let col = 0; col < GameGlobal.col; col++) {
                if(this.checkAdjacentMatch(row,col,idGrid)) {
                    return true;
                }
            }
        }
        return false;
    }

    checkAdjacentMatch(row: number, col: number,idGrid:any[][]): boolean {
        let originId = this.blockArr[row][col].getComponent(Block).getID();   
        // 주변 블록의 상대적인 위치
        const directions = [
            { row: 1, col: 0 },  
            { row: -1, col: 0 }, 
            { row: 0, col: -1 }, 
            { row: 0, col: 1 }  
        ];
        for (const dir of directions) {
            const newRow = row + dir.row;
            const newCol = col + dir.col;
            if (newRow < 0 || newRow >= GameGlobal.row || newCol < 0 || newCol >= GameGlobal.col) {
                continue;
            }

            let newId = this.blockArr[newRow][newCol].getComponent(Block).getID();
            let newGrid = JSON.parse(JSON.stringify(idGrid));
            newGrid[row][col] =newId;
            newGrid[newRow][newCol] = originId;
           
            let matchType = this.checkMatchType(row,col,newGrid);
            if (matchType !== MatchType.None) {
                console.log('enable',row,col);
                return true;
            }
        }
    
        return false;
    }

    moveDownBlocks (): void {
        let downResults = [];

        this.printBlock();
        for(let row = GameGlobal.row-1; row >= 0; row--) {
            for( let col = 0 ; col<GameGlobal.col; col++) {
                if(!!this.blockArr[row][col]) {
                    let downCount : number = this.getDownCount(row,col);
                    if(downCount > 0) {
                        let movePos : Vec3 = this.getBlockPos(row-downCount,col);
                        downResults.push({row,col,downCount,block:this.blockArr[row][col],movePos});
                    }
                }
            }

        }

        // create
        for( let col = 0 ; col<GameGlobal.col; col++) {
            let downCount : number = this.getDownCount(GameGlobal.row,col);
                
            for(let r = 0; r<downCount; r++) {
                let block = this.createRandomBlock((GameGlobal.row+r),col);
                let movePos : Vec3 = this.getBlockPos(GameGlobal.row+r-downCount,col);

                downResults.push({row:GameGlobal.row+r,col,downCount,block,movePos});
            }
        }

        let funcs = [];
        downResults.forEach(e => {
            funcs.push(() => this.moveTweenPromise(e.block, e.movePos, this.moveDuration * e.downCount));
        });
        Promise.all(funcs.map(func => func())).then(() => {
            console.log("이동이 모두 완료되었습니다.");
            
            downResults.forEach(e => {
                let row = e.row-e.downCount;
                let col = e.col;
                let block = e.block;
                block.getComponent(Block).setPositionInfo(row,col);
                this.blockArr[row][col] = block;
            });
            this.printBlock();
            this.changeState(State.CheckMatch);
        });
    }

    getDownCount (row,col) :number {
        if(row <= 0) 
            return 0;

        let nullCount : number = 0;
        for( let r = row-1 ; r>=0; r--) {
            if(this.blockArr[r][col] == null) {
                nullCount++;
            }
        }
        return nullCount;
    } 
    
    
}
