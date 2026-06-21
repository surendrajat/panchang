<script module lang="ts">
  let _uid = 0;
</script>

<script lang="ts">
  // A small but recognisably "earthy" Earth: blue oceans, green continents, a
  // polar cap and a soft specular highlight + atmosphere rim. Renders an SVG <g>
  // (like BodyIcon) so it can sit inside the wheel, the orbital diagram and the
  // concept intro — one source, so Earth looks the same everywhere.
  let { cx = 0, cy = 0, r = 12 }: { cx?: number; cy?: number; r?: number } = $props();
  _uid += 1;
  const id = `ei${_uid}`;

  // continents as organic blobs, sized/placed in fractions of r
  const conts = $derived(
    [
      // left land mass (Africa/Europe-ish)
      `M${cx - r * 0.5} ${cy - r * 0.22} q${r * 0.26} ${-r * 0.22} ${r * 0.52} ${-r * 0.06} q${r * 0.16} ${r * 0.22} ${r * 0.0} ${r * 0.42} q${-r * 0.22} ${r * 0.18} ${-r * 0.48} ${r * 0.04} q${-r * 0.14} ${-r * 0.2} ${-r * 0.04} ${-r * 0.18} Z`,
      // lower-right land mass (Asia/Australia-ish)
      `M${cx + r * 0.12} ${cy + r * 0.08} q${r * 0.3} ${-r * 0.12} ${r * 0.46} ${r * 0.14} q${r * 0.04} ${r * 0.26} ${-r * 0.16} ${r * 0.4} q${-r * 0.24} ${r * 0.06} ${-r * 0.34} ${-r * 0.14} q${-r * 0.04} ${-r * 0.22} ${r * 0.04} ${-r * 0.28} Z`,
      // small upper island
      `M${cx + r * 0.24} ${cy - r * 0.52} q${r * 0.2} ${-r * 0.04} ${r * 0.24} ${r * 0.16} q${-r * 0.04} ${r * 0.16} ${-r * 0.22} ${r * 0.12} q${-r * 0.12} ${-r * 0.06} ${-r * 0.02} ${-r * 0.28} Z`,
    ].join(' '),
  );
</script>

<g class="earth">
  <defs>
    <radialGradient id="{id}o" cx="34%" cy="30%" r="84%">
      <stop offset="0%" stop-color="#7cb8ec" />
      <stop offset="52%" stop-color="#2f7bc0" />
      <stop offset="100%" stop-color="#173f73" />
    </radialGradient>
    <clipPath id="{id}c"><circle {cx} {cy} {r} /></clipPath>
  </defs>
  <circle {cx} {cy} {r} fill="url(#{id}o)" />
  <g clip-path="url(#{id}c)">
    <path d={conts} fill="#4f9d5a" />
    <path d={conts} fill="#3c7e49" opacity="0.5" transform="translate({r * 0.04} {r * 0.05})" />
    <!-- north polar cap -->
    <ellipse {cx} cy={cy - r * 0.84} rx={r * 0.52} ry={r * 0.22} fill="#eef6ff" opacity="0.85" />
    <!-- specular sheen (top-left) -->
    <ellipse
      cx={cx - r * 0.34}
      cy={cy - r * 0.36}
      rx={r * 0.42}
      ry={r * 0.3}
      fill="#ffffff"
      opacity="0.16"
    />
  </g>
  <circle
    {cx}
    {cy}
    {r}
    fill="none"
    stroke="rgba(8,28,58,0.4)"
    stroke-width={Math.max(0.5, r * 0.06)}
  />
</g>

<style>
  .earth {
    pointer-events: none;
  }
</style>
