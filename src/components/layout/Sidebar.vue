<template>
  <aside class="sidebar">
    <div class="sidebar__brand">
      <div class="sidebar__logo">
        <span></span>
      </div>
      <div class="sidebar__brand-copy">
        <strong>极域音乐</strong>
        <small>{{ uiMode.isTV ? 'TV Player' : uiMode.isMobile ? 'Mobile Player' : 'Desktop Player' }}</small>
      </div>
    </div>

    <nav class="sidebar__nav">
      <router-link
        v-for="item in navItems"
        :key="item.path"
        :to="item.path"
        class="sidebar__nav-item"
        active-class="is-active"
        tabindex="0"
        :data-tv-focusable="uiMode.isTV ? '' : undefined"
      >
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path :d="item.icon" />
        </svg>
        <span>{{ item.label }}</span>
      </router-link>
    </nav>
  </aside>
</template>

<script setup lang="ts">
import { useUIModeStore } from '../../store/uiMode'
import { useNavItems } from '../../composables/useNavItems'

const uiMode = useUIModeStore()
const { navItems } = useNavItems()
</script>

<style scoped lang="scss">
.sidebar {
  height: 100%;
  min-width: 0;
  min-height: 0;
  padding: 18px 12px 16px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  overflow: auto;
    border-radius: 0;
  background:
    radial-gradient(circle at top left, rgba(255, 255, 255, 0.08), transparent 26%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.06), rgba(255, 255, 255, 0.025));
  backdrop-filter: blur(18px);
}

.sidebar__brand {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 2px 4px 12px;
  border-bottom: 1px solid var(--border-color);
}

.sidebar__logo {
  width: 40px;
  height: 40px;
  border-radius: var(--radius-md);
  display: grid;
  place-items: center;
  background:
    radial-gradient(circle at 30% 25%, rgba(255, 255, 255, 0.34), transparent 30%),
    linear-gradient(145deg, #6366F1, #4338CA);
  box-shadow: 0 14px 32px color-mix(in srgb, var(--primary-color) 24%, transparent);
  transition: transform var(--transition-fast), box-shadow var(--transition-fast);

  &:hover {
    transform: scale(1.05);
    box-shadow: 0 16px 36px color-mix(in srgb, var(--primary-color) 30%, transparent);
  }

  span {
    width: 16px;
    height: 16px;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.92);
    animation: logo-pulse 3s ease-in-out infinite;
  }
}

@keyframes logo-pulse {
  0%, 100% { transform: scale(1); opacity: 0.92; }
  50% { transform: scale(0.88); opacity: 1; }
}

.sidebar__brand-copy {
  strong,
  small {
    display: block;
  }

  strong {
    font-size: 0.92rem;
    letter-spacing: -0.03em;
  }

  small {
    margin-top: 3px;
    color: var(--text-tertiary);
    font-size: 0.62rem;
    text-transform: uppercase;
    letter-spacing: 0.14em;
  }
}

.sidebar__nav {
  display: flex;
  flex-direction: column;
  gap: 7px;
}

.sidebar__nav-item {
  display: grid;
  grid-template-columns: 18px minmax(0, 1fr);
  align-items: center;
  gap: 9px;
  min-height: 44px;
  padding: 0 12px;
  border-radius: var(--radius-md);
  color: var(--text-secondary);
  border: 1px solid transparent;
  background: rgba(255, 255, 255, 0.045);
  transition:
    background var(--transition-fast),
    color var(--transition-fast),
    border-color var(--transition-fast),
    transform var(--transition-fast),
    box-shadow var(--transition-fast);

  svg {
    width: 18px;
    height: 18px;
    stroke: currentColor;
    stroke-width: 1.8;
    stroke-linecap: round;
    stroke-linejoin: round;
    transition: transform var(--transition-fast);
  }

  span {
    font-size: 0.82rem;
    font-weight: 600;
  }

  &:hover {
    background: linear-gradient(135deg, rgba(255, 255, 255, 0.12), rgba(215, 192, 255, 0.08));
    color: var(--text-primary);
    border-color: rgba(255, 255, 255, 0.14);
    box-shadow: var(--inset-highlight);
    transform: translateX(2px);
  }

  &:active {
    transform: translateX(2px) scale(0.98);
  }

  &.is-active {
    background: linear-gradient(135deg, rgba(255, 255, 255, 0.12), color-mix(in srgb, var(--primary-color) 10%, rgba(215, 192, 255, 0.08)));
    color: var(--text-primary);
    border-color: color-mix(in srgb, var(--primary-color) 24%, rgba(255, 255, 255, 0.14));
    box-shadow: var(--inset-highlight);
  }
}

// === TV 模式适配 ===
[data-ui-mode='tv'] {
  .sidebar {
    padding: 24px 16px 20px;
  border-radius: 0;
    backdrop-filter: none;
  }

  .sidebar__logo {
    width: 56px;
    height: 56px;
    border-radius: var(--radius-md);

    span {
      width: 22px;
      height: 22px;
    }
  }

  .sidebar__brand-copy strong {
    font-size: 1.2rem;
  }

  .sidebar__brand-copy small {
    font-size: 0.78rem;
  }

  .sidebar__nav-item {
    min-height: 56px;
    padding: 0 16px;
    border-radius: var(--radius-md);

    svg {
      width: 24px;
      height: 24px;
    }

    span {
      font-size: 1.06rem;
    }
  }
}
</style>

<style lang="scss">
.app-layout-shell--compact .sidebar {
  flex-direction: row;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: var(--radius-md);
  overflow-x: auto;
  overflow-y: hidden;
}

.app-layout-shell--compact .sidebar__brand {
  flex-shrink: 0;
  gap: 8px;
  padding: 0 6px 0 0;
  border-bottom: none;
  border-right: 1px solid rgba(255, 255, 255, 0.1);
}

.app-layout-shell--compact .sidebar__logo {
  width: 28px;
  height: 28px;
  border-radius: 8px;
}

.app-layout-shell--compact .sidebar__logo span {
  width: 10px;
  height: 10px;
}

.app-layout-shell--compact .sidebar__brand-copy {
  display: none;
}

.app-layout-shell--compact .sidebar__nav {
  flex-direction: row;
  gap: 4px;
  flex: 1;
  min-width: 0;
}

.app-layout-shell--compact .sidebar__nav-item {
  min-height: 30px;
  min-width: 30px;
  padding: 0;
  border-radius: 8px;
  flex: 0 0 auto;
  justify-content: center;
}

.app-layout-shell--compact .sidebar__nav-item span {
  display: none;
}

.app-layout-shell--compact .sidebar__nav-item svg {
  width: 16px;
  height: 16px;
}
</style>
