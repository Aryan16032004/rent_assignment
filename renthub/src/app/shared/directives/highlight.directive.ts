import { Directive, ElementRef, HostListener, Input, Renderer2 } from '@angular/core';

/**
 * Custom Directive: AppHighlight
 * Demonstrates Angular Custom Directive creation using @Directive, @HostListener, ElementRef, and Renderer2.
 * Highlights an element with a smooth background color on hover.
 */
@Directive({
  selector: '[appHighlight]',
  standalone: true
})
export class HighlightDirective {
  @Input() appHighlight = 'rgba(2, 132, 199, 0.08)';

  constructor(
    private readonly el: ElementRef,
    private readonly renderer: Renderer2
  ) {}

  @HostListener('mouseenter')
  onMouseEnter(): void {
    this.renderer.setStyle(this.el.nativeElement, 'backgroundColor', this.appHighlight);
    this.renderer.setStyle(this.el.nativeElement, 'transition', 'background-color 0.2s ease');
  }

  @HostListener('mouseleave')
  onMouseLeave(): void {
    this.renderer.removeStyle(this.el.nativeElement, 'backgroundColor');
  }
}
