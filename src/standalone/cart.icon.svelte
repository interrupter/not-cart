<script>
  export let count = 0;
  export let show = true;
  export let animationDuration = 600;

  let cartUpdated = false;

  export function update(){
    cartUpdated = true;
    setTimeout(() => {
      cartUpdated = false;
    }, animationDuration);
  }

  import {
    createEventDispatcher
  } from 'svelte';
  let dispatch = createEventDispatcher();

  function dispatchClick(e) {
    e.preventDefault();
    dispatch('click', {});
    return false;
  }
</script>
{#if show}
<div>
  <a href class="cart-icon-fixed" on:click={dispatchClick}>
    <span class="cart-icon-count {cartUpdated?'updated':''}">{count}</span>
  </a>
</div>
{/if}
