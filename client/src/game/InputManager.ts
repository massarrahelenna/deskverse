type KeyMap = Record<string, boolean>;

export class InputManager {
  private keys: KeyMap = {};
  private justPressed: Set<string> = new Set();
  private onKeyDown: ((e: KeyboardEvent) => void) | null = null;
  private onKeyUp: ((e: KeyboardEvent) => void) | null = null;

  attach(): void {
    this.onKeyDown = (e: KeyboardEvent) => {
      if (!this.keys[e.code]) this.justPressed.add(e.code);
      this.keys[e.code] = true;
    };
    this.onKeyUp = (e: KeyboardEvent) => {
      this.keys[e.code] = false;
    };
    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);
  }

  detach(): void {
    if (this.onKeyDown) window.removeEventListener("keydown", this.onKeyDown);
    if (this.onKeyUp) window.removeEventListener("keyup", this.onKeyUp);
  }

  isDown(code: string): boolean {
    return this.keys[code] === true;
  }

  consumeJustPressed(code: string): boolean {
    if (this.justPressed.has(code)) {
      this.justPressed.delete(code);
      return true;
    }
    return false;
  }

  get up(): boolean {
    return this.isDown("ArrowUp") || this.isDown("KeyW");
  }

  get down(): boolean {
    return this.isDown("ArrowDown") || this.isDown("KeyS");
  }

  get left(): boolean {
    return this.isDown("ArrowLeft") || this.isDown("KeyA");
  }

  get right(): boolean {
    return this.isDown("ArrowRight") || this.isDown("KeyD");
  }

  get interact(): boolean {
    return this.isDown("KeyE");
  }

  get anyDirection(): boolean {
    return this.up || this.down || this.left || this.right;
  }
}
