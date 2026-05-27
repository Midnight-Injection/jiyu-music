<template>
  <div class="download-page page-shell">
    <div class="download-content">
      <div class="queue-panel">
        <div class="queue-panel__head">
          <div class="queue-panel__info">
            <h1>下载管理</h1>
            <div class="queue-tabs">
              <button
                v-for="tab in tabs"
                :key="tab.key"
                type="button"
                class="tab-pill"
                :class="{ active: activeTab === tab.key }"
                @click="activeTab = tab.key"
              >
                {{ tab.label }}
                <span class="tab-count">{{ tab.count }}</span>
              </button>
            </div>
          </div>
          <div class="batch-actions">
            <NButton size="small" secondary round :disabled="!hasActiveDownloads" @click="pauseAll">
              暂停全部
            </NButton>
            <NButton size="small" type="primary" round :disabled="!hasPausedDownloads" @click="resumeAll">
              继续全部
            </NButton>
            <NButton
              size="small"
              type="success"
              secondary
              round
              :disabled="!hasCompletedDownloads"
              @click="clearCompleted"
            >
              清除已完成
            </NButton>
            <NButton size="small" type="error" secondary round :disabled="queue.length === 0" @click="clearAll">
              清空全部
            </NButton>
          </div>
        </div>

        <div class="queue-list">
          <DownloadItem
            v-for="item in currentList"
            :key="item.id"
            :item="item"
            @pause="pauseDownload"
            @resume="resumeDownload"
            @cancel="cancelDownload"
            @retry="retryDownload"
            @openFolder="openFolder"
          />
          <NEmpty v-if="currentList.length === 0" description="暂无任务" />
        </div>

        <div class="queue-summary">
          <div class="summary-item">
            <span class="summary-count">{{ queue.length }}</span>
            <span class="summary-label">总任务</span>
          </div>
          <div class="summary-item summary-item--active">
            <span class="summary-count">{{ downloadQueue.active.length }}</span>
            <span class="summary-label">下载中</span>
          </div>
          <div class="summary-item summary-item--pending">
            <span class="summary-count">{{ downloadQueue.pending.length }}</span>
            <span class="summary-label">等待</span>
          </div>
          <div class="summary-item summary-item--done">
            <span class="summary-count">{{ downloadQueue.completed.length }}</span>
            <span class="summary-label">完成</span>
          </div>
          <div class="summary-item summary-item--failed">
            <span class="summary-count">{{ downloadQueue.failed.length }}</span>
            <span class="summary-label">失败</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { NButton, NEmpty } from 'naive-ui'
import { useDownloadStore } from '../store/download'
import { useSettingsStore } from '../store/settings'
import { invoke } from '@tauri-apps/api/core'
import DownloadItem from '../components/download/DownloadItem.vue'
import type { DownloadItem as DownloadItemType } from '../types/download'

const downloadStore = useDownloadStore()
const settingsStore = useSettingsStore()
const activeTab = ref<'downloading' | 'pending' | 'completed' | 'failed'>('downloading')
let refreshInterval: number | null = null
let lastCompletedCount = 0
let lastFailedCount = 0

const downloadQueue = computed(() => downloadStore.downloadQueue)
const queue = computed(() => downloadStore.queue)
const downloadPath = computed(() => settingsStore.settings.downloadPath.trim())

const currentList = computed(() => {
  switch (activeTab.value) {
    case 'downloading':
      return downloadQueue.value.active
    case 'pending':
      return downloadQueue.value.pending
    case 'completed':
      return downloadQueue.value.completed
    case 'failed':
      return downloadQueue.value.failed
    default:
      return []
  }
})

const hasActiveDownloads = computed(() => downloadQueue.value.active.length > 0)
const hasPausedDownloads = computed(() => queue.value.some((d) => d.status === 'paused'))
const hasCompletedDownloads = computed(() => downloadQueue.value.completed.length > 0)
const maxConcurrentDownloads = computed(() => Math.max(1, settingsStore.settings.maxDownloads))

const tabs = computed(() => [
  { key: 'downloading' as const, label: '下载中', count: downloadQueue.value.active.length },
  { key: 'pending' as const, label: '等待中', count: downloadQueue.value.pending.length },
  { key: 'completed' as const, label: '已完成', count: downloadQueue.value.completed.length },
  { key: 'failed' as const, label: '失败', count: downloadQueue.value.failed.length },
])

async function markTaskPending(id: number) {
  try {
    await invoke('update_download_task', {
      id,
      updates: {
        status: 'pending',
      },
    })
  } catch (error) {
    console.error('Failed to mark task pending:', error)
  }
}

async function drainPendingDownloads() {
  if (!downloadPath.value) return

  const availableSlots = Math.max(
    0,
    maxConcurrentDownloads.value - downloadQueue.value.active.length
  )
  if (availableSlots === 0) return

  const pendingTasks = downloadQueue.value.pending.slice(0, availableSlots)
  await Promise.all(
    pendingTasks.map(async (item) => {
      try {
        await invoke('resume_download', { id: item.id, savePath: downloadPath.value })
        downloadStore.updateDownloadItem(item.id, { status: 'downloading' })
      } catch (error) {
        console.error('Failed to start pending download:', error)
      }
    })
  )
}

async function loadTasks() {
  try {
    const tasks = await invoke<any[]>('get_download_tasks')

    // Track completed and failed counts for notifications
    const completedCount = tasks.filter((t: any) => t.status === 'completed').length
    const failedCount = tasks.filter((t: any) => t.status === 'failed').length

    // Check for newly completed downloads
    if (completedCount > lastCompletedCount && lastCompletedCount > 0) {
      const newCompletions = completedCount - lastCompletedCount
      showNotification(`下载完成`, `${newCompletions} 个文件下载完成`)
    }

    // Check for newly failed downloads
    if (failedCount > lastFailedCount && lastFailedCount > 0) {
      const newFailures = failedCount - lastFailedCount
      showNotification(`下载失败`, `${newFailures} 个文件下载失败`, 'error')
    }

    lastCompletedCount = completedCount
    lastFailedCount = failedCount

    downloadStore.queue = tasks.map((task: any) => ({
      id: task.id,
      songId: task.song_id,
      title: task.filename.replace(/\.[^/.]+$/, ''),
      artist: '',
      url: task.url,
      filename: task.filename,
      status: task.status,
      progress: task.progress || 0,
      speed: 0,
      error: task.error,
      filePath: task.file_path,
      createdAt: task.created_at,
      updatedAt: task.updated_at,
    }))

    await drainPendingDownloads()
  } catch (error) {
    console.error('Failed to load download tasks:', error)
  }
}

function showNotification(title: string, message: string, type: 'success' | 'error' = 'success') {
  // Check if notification permission is granted
  if ('Notification' in window && Notification.permission === 'granted') {
    const icon = type === 'success' ? '✓' : '✕'
    new Notification(`${icon} ${title}`, {
      body: message,
      icon: type === 'success' ? '/icons/success.png' : '/icons/error.png',
    })
  } else if ('Notification' in window && Notification.permission !== 'denied') {
    Notification.requestPermission().then((permission) => {
      if (permission === 'granted') {
        showNotification(title, message, type)
      }
    })
  }

  // Fallback to console for development
  console.log(`[${type.toUpperCase()}] ${title}: ${message}`)
}

function pauseDownload(id: number) {
  invoke('pause_download', { id })
  downloadStore.pauseDownload(id)
}

function resumeDownload(id: number) {
  const item = queue.value.find((d) => d.id === id)
  if (item && downloadPath.value) {
    if (downloadQueue.value.active.length >= maxConcurrentDownloads.value) {
      downloadStore.updateDownloadItem(id, { status: 'pending' })
      void markTaskPending(id)
      return
    }

    invoke('resume_download', { id, savePath: downloadPath.value })
    downloadStore.resumeDownload(id)
  }
}

function cancelDownload(id: number) {
  invoke('delete_download_task', { id })
  downloadStore.cancelDownload(id)
}

function retryDownload(id: number) {
  const item = queue.value.find((d) => d.id === id)
  if (item && downloadPath.value) {
    downloadStore.retryDownload(id)
    if (downloadQueue.value.active.length >= maxConcurrentDownloads.value) {
      void markTaskPending(id)
      return
    }

    invoke('resume_download', { id, savePath: downloadPath.value })
  }
}

async function openFolder(item: DownloadItemType) {
  try {
    if (item.filePath || downloadPath.value) {
      const path = item.filePath || downloadPath.value
      await invoke('open_download_folder', { path })
    }
  } catch (error) {
    console.error('Failed to open folder:', error)
  }
}

function pauseAll() {
  downloadStore.pauseAll()
  downloadQueue.value.active.forEach((item) => {
    invoke('pause_download', { id: item.id })
  })
}

function resumeAll() {
  if (!downloadPath.value) return
  queue.value.forEach((item) => {
    if (item.status === 'paused') {
      downloadStore.updateDownloadItem(item.id, { status: 'pending' })
      void markTaskPending(item.id)
    }
  })
  void drainPendingDownloads()
}

function clearCompleted() {
  downloadQueue.value.completed.forEach((item) => {
    invoke('delete_download_task', { id: item.id })
  })
  downloadStore.clearCompleted()
}

function clearAll() {
  queue.value.forEach((item) => {
    invoke('delete_download_task', { id: item.id })
  })
  downloadStore.clearAll()
}

onMounted(() => {
  loadTasks()
  refreshInterval = window.setInterval(loadTasks, 1000)

  // Request notification permission
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission()
  }
})

onUnmounted(() => {
  if (refreshInterval) {
    clearInterval(refreshInterval)
  }
})
</script>

<style scoped lang="scss">
.download-page {
  container-type: inline-size;
  width: 100%;
  min-width: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;

  &.page-shell {
    width: 100%;
    max-width: none;
    margin: 0;
    padding: 0;
    gap: 0;
  }

  .download-content {
    flex: 1 1 auto;
    min-height: 0;
    height: 100%;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    border-radius: 0;
    background: transparent;
  }

  .queue-panel {
    flex: 1 1 auto;
    min-height: 0;
    display: flex;
    flex-direction: column;
    overflow: hidden;

    h1 {
      margin: 0;
      font-size: 1.15rem;
      font-weight: 700;
      color: var(--text-primary);
      line-height: 1.2;
    }

    .queue-panel__head {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 12px;
      padding: 12px 14px;
      border-bottom: 1px solid var(--border-color);
    }

    .queue-panel__info {
      display: flex;
      align-items: center;
      gap: 12px;
      min-width: 0;
    }

    .queue-tabs {
      display: flex;
      gap: 6px;
    }

    .tab-pill {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 4px 12px;
      border-radius: 999px;
      border: 1px solid var(--border-color);
      background: transparent;
      color: var(--text-secondary);
      font-size: 0.78rem;
      font-weight: 500;
      cursor: pointer;
      transition: background 0.15s, color 0.15s, border-color 0.15s;

      &:hover {
        background: color-mix(in srgb, var(--primary-color) 8%, transparent);
        border-color: color-mix(in srgb, var(--primary-color) 24%, transparent);
        color: var(--text-primary);
      }

      &.active {
        background: color-mix(in srgb, var(--primary-color) 16%, transparent);
        border-color: color-mix(in srgb, var(--primary-color) 40%, transparent);
        color: var(--primary-color);
      }

      .tab-count {
        font-variant-numeric: tabular-nums;
        font-weight: 700;
        font-size: 0.72rem;
        opacity: 0.7;
      }
    }

    .batch-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      flex: 0 0 auto;
    }

    .queue-list {
      flex: 1;
      min-height: 0;
      display: flex;
      flex-direction: column;
      overflow-y: auto;
      padding: 8px 10px;

      :deep(.n-empty) {
        flex: 1 1 0%;
        min-height: 200px;
        display: flex;
        align-items: center;
        justify-content: center;
      }
    }

    .queue-summary {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 6px;
      padding: 8px 14px 10px;
      border-top: 1px solid var(--border-color);
    }

    .summary-item {
      display: flex;
      align-items: center;
      gap: 4px;
      padding: 3px 10px;
      border-radius: 999px;
      background: color-mix(in srgb, var(--text-secondary) 8%, transparent);

      &--active {
        background: color-mix(in srgb, #22c55e 12%, transparent);
      }

      &--pending {
        background: color-mix(in srgb, #eab308 12%, transparent);
      }

      &--done {
        background: color-mix(in srgb, #22c55e 8%, transparent);
      }

      &--failed {
        background: color-mix(in srgb, #ef4444 12%, transparent);
      }
    }

    .summary-count {
      font-size: 0.75rem;
      font-weight: 700;
      font-variant-numeric: tabular-nums;
      color: var(--text-primary);
    }

    .summary-label {
      font-size: 0.68rem;
      color: var(--text-secondary);
    }
  }

  @container (max-width: 960px) {
    .queue-panel {
      .queue-panel__head {
        flex-direction: column;
        align-items: flex-start;
      }

      .batch-actions {
        width: 100%;
      }
    }
  }

  @container (max-width: 720px) {
    .queue-panel {
      .queue-tabs {
        flex-wrap: nowrap;
        overflow-x: auto;
      }

      .batch-actions {
        width: 100%;
      }

      .queue-list {
        padding: 6px 8px;
      }
    }
  }

  @container (max-width: 480px) {
    .queue-panel {
      .queue-panel__head {
        padding: 10px 10px;
      }

      .batch-actions {
        width: 100%;
        flex-wrap: wrap;

        button {
          flex: 1 1 calc(50% - 3px);
          min-width: 0;
        }
      }

      .queue-summary {
        flex-wrap: wrap;
        justify-content: center;
        gap: 4px;
        padding: 6px 10px 8px;
      }

      .summary-item {
        padding: 2px 8px;
      }
    }
  }
}
</style>
