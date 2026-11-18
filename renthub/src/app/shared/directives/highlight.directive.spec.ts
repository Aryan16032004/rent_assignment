import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { describe, it, expect, beforeEach } from 'vitest';
import { HighlightDirective } from './highlight.directive';

@Component({
  standalone: true,
  imports: [HighlightDirective],
  template: `<div appHighlight [appHighlight]="'#e0f2fe'" class="test-box">Hover Me</div>`
})
class TestHostComponent {}

describe('HighlightDirective', () => {
  let fixture: ComponentFixture<TestHostComponent>;
  let element: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TestHostComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(TestHostComponent);
    fixture.detectChanges();
    element = fixture.debugElement.query(By.css('.test-box')).nativeElement;
  });

  it('should apply background color on mouseenter', () => {
    element.dispatchEvent(new MouseEvent('mouseenter'));
    expect(element.style.backgroundColor).toBe('rgb(224, 242, 254)');
  });

  it('should remove background color on mouseleave', () => {
    element.dispatchEvent(new MouseEvent('mouseenter'));
    element.dispatchEvent(new MouseEvent('mouseleave'));
    expect(element.style.backgroundColor).toBe('');
  });
});
