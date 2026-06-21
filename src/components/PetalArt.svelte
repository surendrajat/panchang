<!-- Masthead / colophon ornament: a lotus flanked by two leaves (the centre
     fleuron + side petals, redrawn as line/fill art). Inherits the gold `color`
     of the surrounding .title-ornament via `currentColor`. -->
<span class="petal-art" aria-hidden="true">
  <svg class="petal-art__leaf petal-art__leaf--left" viewBox="0 0 16 18">
    <path class="leaf-blade" d="M3 15.5 Q3.5 7 13.5 3 Q12 11 3 15.5 Z" />
    <path class="leaf-vein" d="M3.6 15 Q8 10 12.6 3.8" />
  </svg>

  <svg class="petal-art__lotus" viewBox="0 0 24 18">
    <path class="lotus-water" d="M4 14.3 Q12 16.6 20 14.3" />
    <path class="lotus-petal lotus-petal--outer" d="M12 14 Q3 12 2.4 6.6 Q8.8 9.4 12 14 Z" />
    <path class="lotus-petal lotus-petal--outer" d="M12 14 Q21 12 21.6 6.6 Q15.2 9.4 12 14 Z" />
    <path class="lotus-petal lotus-petal--inner" d="M12 14 Q6 8.6 7.8 3.2 Q11 7.8 12 14 Z" />
    <path class="lotus-petal lotus-petal--inner" d="M12 14 Q18 8.6 16.2 3.2 Q13 7.8 12 14 Z" />
    <path class="lotus-petal lotus-petal--centre" d="M12 14 Q9.3 6.6 12 1.6 Q14.7 6.6 12 14 Z" />
  </svg>

  <svg class="petal-art__leaf petal-art__leaf--right" viewBox="0 0 16 18">
    <path class="leaf-blade" d="M3 15.5 Q3.5 7 13.5 3 Q12 11 3 15.5 Z" />
    <path class="leaf-vein" d="M3.6 15 Q8 10 12.6 3.8" />
  </svg>
</span>

<style>
  .petal-art {
    display: inline-flex;
    align-items: flex-end;
    gap: 6px;
    color: inherit; /* gold, from .title-ornament */
  }
  .petal-art__lotus {
    width: 23px;
    height: 17px;
  }
  .petal-art__leaf {
    width: 13px;
    height: 15px;
    margin-bottom: 1px;
  }
  /* Mirror the left leaf so the pair splays outward symmetrically. */
  .petal-art__leaf--left {
    transform: scaleX(-1);
  }

  .lotus-petal {
    fill: currentColor;
  }
  .lotus-petal--outer {
    opacity: 0.55;
  }
  .lotus-petal--inner {
    opacity: 0.78;
  }
  .lotus-petal--centre {
    opacity: 1;
  }
  .lotus-water {
    fill: none;
    stroke: currentColor;
    stroke-width: 1;
    stroke-linecap: round;
    opacity: 0.6;
  }
  .leaf-blade {
    fill: currentColor;
    opacity: 0.82;
  }
  /* A faint vein in the page colour cuts the blade so the leaf reads as a leaf. */
  .leaf-vein {
    fill: none;
    stroke: var(--paper);
    stroke-width: 0.9;
    stroke-linecap: round;
    opacity: 0.5;
  }
</style>
