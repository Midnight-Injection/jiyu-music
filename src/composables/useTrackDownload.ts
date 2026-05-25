import { invoke } from '@tauri-apps/api/core'
import { open } from '@tauri-apps/plugin-dialog'
import { writeTextFile } from '@tauri-apps/plugin-fs'
import { useDownloadStore } from '../store/download'
import { useSettingsStore } from '../store/settings'
import type { DownloadItem } from '../types/download'
import type { MusicInfo } from '../types/music'
import { usePlaybackResolver } from '../modules/playback/playbackResolver'
import { useLyricResolver } from '../modules/playback/lyricResolver'
import { resolveWithBuiltinSource } from '../modules/playback/resolvers/builtinResolver'

const DEFAULT_FILE_EXTENSION = 'mp3'

function sanitizeFilenamePart(value?: string | null): string {
  const normalized = String(value || '')
    .replace(/[\\/:*?"<>|]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return normalized || '未知'
}

function inferFileExtension(pathOrUrl: string): string {
  const readExtension = (value: string) => {
    const cleanValue = value.split(/[?#]/)[0] || ''
    const segment = cleanValue.split('/').pop() || ''
    return segment.match(/\.([a-zA-Z0-9]{2,6})$/)?.[1]?.toLowerCase()
  }

  try {
    return readExtension(new URL(pathOrUrl).pathname) || DEFAULT_FILE_EXTENSION
  } catch {
    return readExtension(pathOrUrl) || DEFAULT_FILE_EXTENSION
  }
}

function buildDownloadFilename(track: MusicInfo, template: string, pathOrUrl: string): string {
  const filenameTemplate = template?.trim() || '{artist} - {title}'
  const extension = inferFileExtension(pathOrUrl)
  const filename = filenameTemplate
    .replace(/\{artist\}/gi, sanitizeFilenamePart(track.artist))
    .replace(/\{title\}/gi, sanitizeFilenamePart(track.name))
    .replace(/\{album\}/gi, sanitizeFilenamePart(track.album || '未知专辑'))

  return `${sanitizeFilenamePart(filename)}.${extension}`
}

function createDownloadItem(
  id: number,
  track: MusicInfo,
  url: string,
  filename: string,
  status: DownloadItem['status'],
  filePath?: string,
): DownloadItem {
  const timestamp = new Date().toISOString()
  return {
    id,
    songId: track.storageSongId,
    title: track.name,
    artist: track.artist,
    album: track.album,
    cover: track.cover,
    url,
    filename,
    status,
    progress: status === 'completed' ? 100 : 0,
    speed: 0,
    createdAt: timestamp,
    updatedAt: timestamp,
    filePath,
  }
}

function formatLrcTimestamp(timeMs: number): string {
  const totalCentiseconds = Math.max(0, Math.floor(timeMs / 10))
  const minutes = Math.floor(totalCentiseconds / 6000)
  const seconds = Math.floor((totalCentiseconds % 6000) / 100)
  const centiseconds = totalCentiseconds % 100
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${centiseconds.toString().padStart(2, '0')}`
}

function serializeLyricsToLrc(lines: Array<{ time_ms: number; text: string; translation?: string }>): string {
  return lines
    .map((line) => {
      const parts = [`[${formatLrcTimestamp(line.time_ms)}]${line.text || ''}`]
      if (line.translation) {
        parts.push(`[${formatLrcTimestamp(line.time_ms)}]${line.translation}`)
      }
      return parts.join('\n')
    })
    .join('\n')
}

function replaceFileExtension(filename: string, extension: string): string {
  return filename.replace(/\.[^/.]+$/, extension)
}

export function useTrackDownload() {
  const settingsStore = useSettingsStore()
  const downloadStore = useDownloadStore()
  const playbackResolver = usePlaybackResolver()
  const lyricResolver = useLyricResolver()

  async function ensureDownloadPath(): Promise<string> {
    const currentPath = settingsStore.settings.downloadPath.trim()
    if (currentPath) return currentPath

    const selected = await open({
      directory: true,
      multiple: false,
      title: '选择下载路径',
    })

    if (!selected || typeof selected !== 'string') {
      throw new Error('未选择下载目录')
    }

    settingsStore.updateSetting('downloadPath', selected)
    return selected
  }


  async function resolveDownloadSource(track: MusicInfo) {
    try {
      const playbackResolution = await playbackResolver.resolve(track)

      if (playbackResolution.resolver === 'cached-local') {
        if (playbackResolution.localFilePath) {
          return playbackResolution
        }

        console.warn('[Download] Cached local playback has no local file path, resolving fresh download URL:', {
          name: track.name,
          artist: track.artist,
        })
      }

      if (playbackResolution.resolver !== 'cached-local' && playbackResolution.resolver !== 'cached-remote') {
        return playbackResolution
      }

      return await playbackResolver.resolve(track, { ignorePlaybackCache: true })
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      if (message !== '暂无可用音源') throw error

      const builtinResolution = await resolveWithBuiltinSource(
        track,
        settingsStore.settings.audioQuality,
      )

      if (!builtinResolution) {
        throw error
      }

      return builtinResolution
    }
  }

  async function downloadTrack(track: MusicInfo): Promise<{ id: number; savePath: string; filename: string }> {
    if (!settingsStore.settings.downloadEnabled) {
      throw new Error('下载功能已关闭，请先在设置中开启')
    }

    const savePath = await ensureDownloadPath()
    const resolution = await resolveDownloadSource(track)

    if (!resolution.url) {
      throw new Error(`未获取到可下载链接：${track.name}`)
    }

    const downloadSource = resolution.localFilePath || resolution.url
    const filename = buildDownloadFilename(
      track,
      settingsStore.settings.fileNaming,
      downloadSource,
    )
    const tasks = await invoke<Array<{ status: string }>>('get_download_tasks')
    const activeCount = tasks.filter((task) => task.status === 'downloading').length
    const shouldStartImmediately = activeCount < Math.max(1, settingsStore.settings.maxDownloads)

    let taskId: number | null = null
    let completedFilePath: string | undefined

    try {
      taskId = await invoke<number>('create_download_task', {
        songId: track.storageSongId ?? null,
        url: downloadSource,
        filename,
      })

      if (resolution.localFilePath) {
        completedFilePath = await invoke<string>('complete_download_from_local_file', {
          id: taskId,
          sourcePath: resolution.localFilePath,
          savePath,
        })
      } else if (shouldStartImmediately) {
        await invoke('start_download', { id: taskId, savePath })
      }

      if (settingsStore.settings.downloadLyrics) {
        try {
          const lyricResult = await lyricResolver.resolve(
            track,
            resolution.userSourceId,
            resolution.channel,
          )

          if (lyricResult?.lines.length) {
            const lyricFilename = replaceFileExtension(filename, '.lrc')
            const lyricPath = `${savePath}/${lyricFilename}`
            await writeTextFile(lyricPath, serializeLyricsToLrc(lyricResult.lines))
          }
        } catch (error) {
          console.warn('[Download] Failed to export lyrics:', error)
        }
      }

      downloadStore.addDownloadItem(
        createDownloadItem(
          taskId,
          track,
          resolution.url,
          filename,
          completedFilePath ? 'completed' : shouldStartImmediately ? 'downloading' : 'pending',
          completedFilePath,
        ),
      )

      return {
        id: taskId,
        savePath,
        filename,
      }
    } catch (error) {
      if (taskId !== null) {
        await invoke('delete_download_task', { id: taskId }).catch(() => {})
      }
      throw error instanceof Error ? error : new Error(String(error))
    }
  }

  return {
    downloadTrack,
  }
}
