<script lang="ts">
    import { onDestroy, onMount } from 'svelte';

    // eslint-disable-next-line no-undef
    export let target: HTMLElement | null | undefined =
        // eslint-disable-next-line no-undef
        globalThis.document?.body;
    export let enable = true;
    // eslint-disable-next-line no-undef
    let ref: HTMLElement;

    onMount(() => {
        if (enable && target) {
            target.appendChild(ref);
        }
    });

    onDestroy(() => {
        if (enable) {
            setTimeout(() => {
                if (ref?.parentNode) {
                    ref.parentNode?.removeChild(ref);
                }
            });
        }
    });
</script>

{#if enable}
    <div bind:this={ref}>
        <slot />
    </div>
{:else}
    <slot />
{/if}
