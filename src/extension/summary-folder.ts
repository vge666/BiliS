import { summaryFileName, summaryToMarkdown } from '../lib/summary-text.ts'
import type { StoredSummary, VideoMeta } from '../lib/types.ts'

const DB_NAME = 'bilis'
const STORE = 'handles'
const HANDLE_KEY = 'summary-dir'

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1)
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE)) request.result.createObjectStore(STORE)
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('打不开本地数据库'))
  })
}

async function withStore<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openDb()
  try {
    return await new Promise<T>((resolve, reject) => {
      const tx = db.transaction(STORE, mode)
      const request = run(tx.objectStore(STORE))
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error ?? new Error('读写文件夹记录失败'))
    })
  } finally {
    db.close()
  }
}

export async function rememberSummaryFolder(handle: FileSystemDirectoryHandle): Promise<void> {
  await withStore('readwrite', (store) => store.put(handle, HANDLE_KEY))
}

export async function loadSummaryFolder(): Promise<FileSystemDirectoryHandle | null> {
  const handle = await withStore<FileSystemDirectoryHandle | undefined>('readonly', (store) => store.get(HANDLE_KEY))
  return handle ?? null
}

export async function pickSummaryFolder(): Promise<string> {
  if (!window.showDirectoryPicker) throw new Error('这个浏览器不能选择文件夹。请使用 Chrome 116 或更新版本。')
  const handle = await window.showDirectoryPicker({ mode: 'readwrite' })
  const permission = await handle.requestPermission({ mode: 'readwrite' })
  if (permission !== 'granted') throw new Error('没有获得这个文件夹的写入权限。')
  await rememberSummaryFolder(handle)
  return handle.name
}

export async function summaryFolderName(): Promise<string | null> {
  const handle = await loadSummaryFolder()
  return handle?.name ?? null
}

async function writableFolder(): Promise<FileSystemDirectoryHandle> {
  const handle = await loadSummaryFolder()
  if (!handle) throw new Error('先在设置里选择保存文件夹。')
  const permission = await handle.queryPermission({ mode: 'readwrite' })
  if (permission !== 'granted') throw new Error('文件夹权限已失效。回到设置里重新选择一次。')
  return handle
}

export async function writeSummaryFile(meta: VideoMeta, stored: StoredSummary): Promise<string> {
  const folder = await writableFolder()
  const filename = summaryFileName(meta)
  const file = await folder.getFileHandle(filename, { create: true })
  const writer = await file.createWritable()
  await writer.write(summaryToMarkdown(meta, stored))
  await writer.close()
  return filename
}
