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


<style>
.cart-icon-fixed {
  text-decoration: none;
  position: fixed;
  z-index: 30;
  height: 72px;
  width: 72px;
  overflow: visible;
  cursor: pointer;
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
  user-select: none;
  bottom: 40px;
  position: fixed;
  bottom: 20px;
  right: 5%;
  border-radius: 10px;
  border-color: none;
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.2);
  /* Параметры тени */
  padding: 10px;
  background: #fcfcfc url(/assets/cart/img/cd-icons-cart-close.svg) no-repeat center;
  transition: -webkit-transform .2s;
  transition: transform .2s;
  transition: transform .2s, -webkit-transform .2s;
  -webkit-transform: translateZ(0);
  transform: translateZ(0);
  will-change: transform;
  -webkit-backface-visibility: hidden;
  backface-visibility: hidden;
}

.cart-icon-count {
  position: absolute;
  top: calc(var(--text-sm)*-2.5/2);
  right: calc(var(--text-sm)*-2.5/2);
  height: calc(var(--text-sm)*2.5);
  width: calc(var(--text-sm)*2.5);
  background: var(--color-primary);
  color: hsl(0, 0%, 100%);
  font-size: var(--text-sm);
  font-weight: 700;
  border-radius: 50%;
  text-indent: 0;
  transition: -webkit-transform .2s .5s;
  transition: transform .2s .5s;
  transition: transform .2s .5s, -webkit-transform .2s .5s;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  line-height: calc(var(--text-sm)*2.5);
}

@keyframes beat {
  from {
    top: calc(var(--text-sm)*-2.5/2);
    right: calc(var(--text-sm)*-2.5/2);
    height: calc(var(--text-sm)*2.5);
    width: calc(var(--text-sm)*2.5);
  }

  50% {
    top: calc(var(--text-sm)*-3/2);
    right: calc(var(--text-sm)*-3/2);
    height: calc(var(--text-sm)*3);
    width: calc(var(--text-sm)*3);
    line-height: calc(var(--text-sm)*3);
  }

  to {
    top: calc(var(--text-sm)*-2.5/2);
    right: calc(var(--text-sm)*-2.5/2);
    height: calc(var(--text-sm)*2.5);
    width: calc(var(--text-sm)*2.5);
    line-height: calc(var(--text-sm)*2.5);
  }
}

.cart-icon-count.updated {
  animation: beat 0.6s 1 ease-in-out;
}

</style>
