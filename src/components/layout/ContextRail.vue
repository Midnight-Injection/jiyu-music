<template>
  <aside class="context-rail" :class="{ 'context-rail--search': isSearchPage, 'context-rail--songlist': isSongListPage }">
    <template v-if="isSearchPage">
      <section class="context-rail__panel context-rail__panel--history">
        <div class="context-rail__panel-head">
          <span>歌曲搜索历史</span>
          <button
            v-if="recentKeywords.length"
            type="button"
            class="context-rail__link"
            @click="searchStore.clearRecentKeywords()"
          >
            清空
          </button>
        </div>

        <div v-if="recentKeywords.length" class="context-rail__keywords context-rail__keywords--soft">
          <button
            v-for="keyword in recentKeywords"
            :key="keyword"
            type="button"
            class="context-rail__keyword"
            @click="applyRecentKeyword(keyword)"
          >
            {{ keyword }}
          </button>
        </div>
        <p v-else class="context-rail__empty-copy">还没有搜索历史。搜索过的关键词会显示在这里，点击即可再次搜索。</p>
      </section>
    </template>

    <template v-if="isSongListPage">
      <section class="context-rail__panel context-rail__panel--history">
        <div class="context-rail__panel-head">
          <span>歌单搜索历史</span>
          <button
            v-if="playlistRecentKeywords.length"
            type="button"
            class="context-rail__link"
            @click="playlistSearchStore.clearRecentKeywords()"
          >
            清空
          </button>
        </div>

        <div v-if="playlistRecentKeywords.length" class="context-rail__keywords context-rail__keywords--soft">
          <button
            v-for="keyword in playlistRecentKeywords"
            :key="keyword"
            type="button"
            class="context-rail__keyword"
            @click="applyPlaylistKeyword(keyword)"
          >
            {{ keyword }}
          </button>
        </div>
        <p v-else class="context-rail__empty-copy">还没有歌单搜索历史。</p>
      </section>
    </template>

    <div class="context-rail__poster">
      <img
        v-if="player.currentMusic"
        :src="player.currentMusic.cover || defaultCover"
        :alt="player.currentMusic.name"
        class="context-rail__cover"
        @error="handleCoverError"
      />
      <div v-else class="context-rail__cover context-rail__cover--placeholder">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M9 18V5l12-2v13M9 18c0 1.66-1.34 3-3 3s-3-1.34-3-3 1.34-3 3-3 3 1.34 3 3ZM21 16c0 1.66-1.34 3-3 3s-3-1.34-3-3 1.34-3 3-3 3 1.34 3 3Z" />
        </svg>
      </div>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { usePlayerStore } from '../../store/player'
import { usePlaylistSearchStore } from '../../store/playlistSearch'
import { useSearchStore } from '../../store/search'

const router = useRouter()
const route = useRoute()
const player = usePlayerStore()
const searchStore = useSearchStore()
const playlistSearchStore = usePlaylistSearchStore()

const defaultCover = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="160" height="160"%3E%3Crect fill="%234338CA" width="160" height="160"/%3E%3Ccircle cx="80" cy="80" r="34" fill="%23ffffff" fill-opacity="0.18"/%3E%3C/svg%3E'

const isSearchPage = computed(() => route.name === 'Search')
const isSongListPage = computed(() => route.name === 'SongList')
const recentKeywords = computed(() => searchStore.recentKeywords)
const playlistRecentKeywords = computed(() => playlistSearchStore.recentKeywords)

function handleCoverError(event: Event) {
  const img = event.target as HTMLImageElement
  img.src = defaultCover
}

function applyRecentKeyword(keyword: string) {
  searchStore.setKeyword(keyword)
  void router.push({
    path: '/search',
    query: {
      q: keyword,
      stamp: String(Date.now()),
    },
  })
}

function applyPlaylistKeyword(keyword: string) {
  playlistSearchStore.searchKeyword = keyword
  void router.push({
    path: '/songlist',
    query: {
      q: keyword,
      stamp: String(Date.now()),
    },
  })
}
</script>

<style scoped lang="scss">
.context-rail {
  display: flex;
  flex-direction: column;
  gap: 10px;
  height: 100%;
  min-width: 0;
  min-height: 0;
  padding: 18px 12px 16px;
  overflow: auto;
  border-radius: 0;
  background:
    radial-gradient(circle at top left, rgba(255, 255, 255, 0.08), transparent 26%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.06), rgba(255, 255, 255, 0.025));
  backdrop-filter: blur(18px);
}

.context-rail__panel {
  display: flex;
  flex-direction: column;
  padding: 14px;
  border-radius: var(--radius-sm);
  background:
    radial-gradient(circle at top right, rgba(255, 255, 255, 0.1), transparent 30%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.1), rgba(255, 255, 255, 0.04));
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.context-rail__panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 10px;

  span {
    color: rgba(255, 255, 255, 0.72);
    font-size: 0.64rem;
    letter-spacing: 0.16em;
    text-transform: uppercase;
  }
}

.context-rail__link {
  padding: 4px 9px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.08);
  color: var(--text-primary);
  font-size: 0.66rem;
}

.context-rail__keywords {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.context-rail__keywords--soft {
  gap: 7px;
}

.context-rail__keyword {
  padding: 7px 10px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.08);
  color: var(--text-primary);
  font-size: 0.7rem;
  transition: background-color 0.18s ease, transform 0.18s ease;

  &:hover {
    background: rgba(255, 255, 255, 0.14);
    transform: translateY(-1px);
  }
}

.context-rail__empty-copy {
  color: var(--text-secondary);
  font-size: 0.74rem;
  line-height: 1.5;
}

.context-rail__poster {
  margin-top: auto;
  cursor: pointer;
  transition: transform var(--transition-fast);

  &:hover {
    transform: translateY(-2px);
  }

  &:active {
    transform: scale(0.98);
  }
}

.context-rail__cover {
  width: 100%;
  aspect-ratio: 1;
  border-radius: var(--radius-md);
  object-fit: cover;
  background: rgba(255, 255, 255, 0.08);
  box-shadow: 0 10px 28px color-mix(in srgb, var(--primary-color) 14%, transparent);
}

.context-rail__cover--placeholder {
  display: grid;
  place-items: center;
  background: linear-gradient(135deg, color-mix(in srgb, var(--primary-color) 30%, transparent), color-mix(in srgb, var(--secondary-color) 22%, transparent));
  color: rgba(255, 255, 255, 0.36);
}
</style>
