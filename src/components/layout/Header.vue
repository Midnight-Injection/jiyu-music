<template>
  <header class="header">
    <div class="header__title-block">
      <div class="header__title-row">
        <svg v-if="pageIcon" class="header__page-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path :d="pageIcon" />
        </svg>
        <span class="page-kicker">Jiyu Music</span>
      </div>
      <h2>{{ title }}</h2>
      <p>{{ subtitle }}</p>
    </div>

    <div class="header__actions">
      <label v-if="!isSearchPage" class="header__search glass-panel">
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M10.5 4a6.5 6.5 0 1 0 4.03 11.6l4.44 4.44 1.41-1.41-4.44-4.44A6.5 6.5 0 0 0 10.5 4Z M6 10.5a4.5 4.5 0 1 1 9 0a4.5 4.5 0 0 1-9 0Z"
          />
        </svg>
        <input
          v-model="searchText"
          type="text"
          placeholder="搜索歌曲、歌手、专辑"
          @keyup.enter="handleSearch"
        />
      </label>

      <button class="header__status" type="button" @click="router.push('/player')">
        <strong>{{ player.currentMusic?.name || '未播放' }}</strong>
        <span>{{ player.isPlaying ? '正在播放' : '播放器' }}</span>
      </button>
    </div>
  </header>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { usePlayerStore } from '../../store/player'

const route = useRoute()
const router = useRouter()
const player = usePlayerStore()
const searchText = ref('')

const iconMap: Record<string, string> = {
  Search: 'M10.5 4a6.5 6.5 0 1 0 4.03 11.6l4.44 4.44 1.41-1.41-4.44-4.44A6.5 6.5 0 0 0 10.5 4Z M6 10.5a4.5 4.5 0 1 1 9 0a4.5 4.5 0 0 1-9 0Z',
  SongList: 'M5 6.5h14M5 12h14M5 17.5h9M17 16V8l4 2.25V18L17 16Z',
  Leaderboard: 'M6 18.5h12M8 18.5V11m4 7.5V6m4 12.5v-9',
  List: 'M6 7h12M6 12h12M6 17h7M17.5 15.5V8l3.5 1.8v5.7',
  Download: 'M12 4v10m0 0l4-4m-4 4l-4-4M5 19h14',
  Setting: 'M12 8.5a3.5 3.5 0 1 0 0 7a3.5 3.5 0 0 0 0-7Zm8 3.5l-1.83-.4a6.98 6.98 0 0 0-.65-1.57l1.03-1.56-1.41-1.41-1.56 1.03a6.98 6.98 0 0 0-1.57-.65L12 4l-1.81 1.83a6.98 6.98 0 0 0-1.57.65L7.06 5.45 5.64 6.86l1.03 1.56c-.28.5-.49 1.02-.65 1.57L4.2 12l1.82 1.81c.16.55.37 1.07.65 1.57l-1.03 1.56 1.42 1.41 1.56-1.03c.5.28 1.02.49 1.57.65L12 20l1.83-1.82c.55-.16 1.07-.37 1.57-.65l1.56 1.03 1.41-1.41-1.03-1.56c.28-.5.49-1.02.65-1.57L20 12Z',
  PlayerDetail: 'M9 18V5l12-2v13M9 18c0 1.66-1.34 3-3 3s-3-1.34-3-3 1.34-3 3-3 3 1.34 3 3ZM21 16c0 1.66-1.34 3-3 3s-3-1.34-3-3 1.34-3 3-3 3 1.34 3 3Z',
}

const pageIcon = computed(() => iconMap[String(route.name || '')] || '')

const copyMap: Record<string, string> = {
  Search: '从搜索开始，再进入播放和收藏。',
  SongList: '看精选歌单，不被多余信息打断。',
  Leaderboard: '近期热度变化与平台趋势。',
  List: '整理试听列表、收藏和自建歌单。',
  Download: '下载任务与路径配置。',
  Setting: '主题、音源与歌词偏好。',
  PlayerDetail: '播放控制与歌词联动。',
}

const title = computed(() => String(route.meta.title || '极域音乐'))
const subtitle = computed(() => copyMap[String(route.name || '')] || '更清晰的桌面音乐播放器。')
const isSearchPage = computed(() => route.name === 'Search')

function handleSearch() {
  if (!searchText.value.trim()) return
  router.push({ path: '/search', query: { q: searchText.value.trim() } })
}
</script>

<style scoped lang="scss">
.header {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 10px;
  min-width: 0;
  min-height: 46px;
  padding: 4px 16px 0;
}

.header__title-block {
  min-width: 0;

  .header__title-row {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  h2 {
    margin-top: 1px;
    font-size: 1.1rem;
    letter-spacing: -0.04em;
  }

  p {
    margin-top: 1px;
    color: var(--text-secondary);
    font-size: 0.74rem;
  }
}

.header__page-icon {
  width: 14px;
  height: 14px;
  stroke: var(--primary-color);
  stroke-width: 1.8;
  stroke-linecap: round;
  stroke-linejoin: round;
  fill: none;
  flex-shrink: 0;
}

.header__actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  flex-wrap: wrap;
  gap: 8px;
  min-width: 0;
}

.header__search {
  display: flex;
  align-items: center;
  gap: 8px;
  width: clamp(180px, 25vw, 320px);
  max-width: 100%;
  height: 40px;
  padding: 0 12px;
  border-radius: 999px;
  box-shadow: none;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid var(--border-color);

  svg {
    width: 16px;
    height: 16px;
    stroke: var(--text-tertiary);
    stroke-width: 1.8;
    stroke-linecap: round;
    stroke-linejoin: round;
  }

  input {
    width: 100%;
    border: none;
    background: transparent;
    color: var(--text-primary);
    outline: none;
  }
}

.header__status {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
  min-width: 100px;
  flex: 0 1 182px;
  max-width: 182px;
  min-height: 40px;
  padding: 0 12px;
  border-radius: 999px;
  background: linear-gradient(135deg, color-mix(in srgb, var(--primary-color) 16%, transparent), color-mix(in srgb, var(--secondary-color) 12%, transparent));
  border: 1px solid var(--border-color);
  color: var(--text-primary);
  box-shadow: none;

  strong,
  span {
    display: block;
    width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  strong {
    font-size: 0.8rem;
    font-weight: 700;
  }

  span {
    margin-top: 2px;
    color: var(--text-secondary);
    font-size: 0.66rem;
  }
}

@media (max-width: 920px) {
  .header {
    grid-template-columns: 1fr;
    gap: 6px;
    padding: 4px 10px 0;
  }

  .header__actions {
    justify-content: flex-start;
  }

  .header__search {
    width: clamp(140px, 40vw, 260px);
  }

  .header__status {
    min-width: 80px;
    flex: 0 1 140px;
    max-width: 140px;
    min-height: 34px;

    strong {
      font-size: 0.74rem;
    }
  }

  .header__title-block {
    h2 {
      font-size: 0.96rem;
    }

    p {
      font-size: 0.68rem;
    }
  }
}

@media (max-width: 720px) {
  .header {
    padding: 2px 8px 0;
  }

  .header__title-block {
    .page-kicker {
      font-size: 0.64rem;
    }

    h2 {
      font-size: 0.86rem;
    }

    p {
      display: none;
    }
  }

  .header__search {
    width: clamp(100px, 35vw, 200px);
    height: 34px;
  }

  .header__status {
    flex: 0 1 120px;
    max-width: 120px;
    min-height: 34px;

    span {
      display: none;
    }
  }
}
</style>
