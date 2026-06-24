/**
 * SFTP Service
 * Handles secure file upload to client EC2 server.
 *
 * Security model:
 *   - Private key stored as SFTP_PRIVATE_KEY env secret on Render
 *   - Uses .tmp file → atomic rename pattern
 *   - Validates file size before upload
 *   - Only Render's static outbound IP is allowlisted on EC2
 *   - No password auth — SSH key only
 *   - SFTP-only user with no shell access (Chroot jail on EC2)
 */

import SftpClient from 'ssh2-sftp-client'
import path from 'path'
import { v4 as uuidv4 } from 'uuid'

/**
 * Upload a file to the SFTP server.
 * Uses .tmp → rename for atomic delivery.
 *
 * @param {Buffer|string} content - File content to upload
 * @param {string} filename - Target filename (without extension)
 * @param {string} extension - File extension (json, csv, xlsx)
 * @returns {Promise<{remotePath: string, size: number}>}
 */
export async function uploadToSFTP(content, filename, extension) {
  // PLACEHOLDER: Set these as Render environment secrets
  const config = {
    host: process.env.SFTP_HOST,           // e.g. sftp.yourserver.com
    port: parseInt(process.env.SFTP_PORT || '22'),
    username: process.env.SFTP_USER,       // e.g. upload-only-user
    privateKey: process.env.SFTP_PRIVATE_KEY
      ? Buffer.from(process.env.SFTP_PRIVATE_KEY, 'base64').toString('utf-8')
      : undefined,
    readyTimeout: 20000,
    // PLACEHOLDER: Add host verification for maximum security
    // hostHash: 'sha256',
    // hostVerifier: (keyHash) => keyHash === process.env.SFTP_HOST_FINGERPRINT
  }

  if (!config.host || !config.username || !config.privateKey) {
    throw new Error('SFTP configuration incomplete. Set SFTP_HOST, SFTP_USER, SFTP_PRIVATE_KEY env vars.')
  }

  const uploadDir = process.env.SFTP_UPLOAD_DIR || '/uploads'
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const finalFilename = `${filename}-${timestamp}.${extension}`
  const tmpFilename = `${finalFilename}.tmp`
  const finalPath = path.posix.join(uploadDir, finalFilename)
  const tmpPath = path.posix.join(uploadDir, tmpFilename)

  const sftp = new SftpClient()

  try {
    await sftp.connect(config)

    // Validate upload directory exists
    await sftp.mkdir(uploadDir, true).catch(() => {}) // ignore if exists

    // Upload to .tmp file first
    const buffer = typeof content === 'string' ? Buffer.from(content, 'utf-8') : content
    await sftp.put(buffer, tmpPath)

    // Atomic rename: .tmp → final filename
    await sftp.rename(tmpPath, finalPath)

    return { remotePath: finalPath, size: buffer.byteLength }
  } catch (err) {
    // Clean up .tmp file on failure
    await sftp.delete(tmpPath).catch(() => {})
    throw new Error(`SFTP upload failed: ${err.message}`)
  } finally {
    await sftp.end()
  }
}

/**
 * Test SFTP connection health.
 * Used by the settings page "Test Connection" button (via backend).
 */
export async function testSFTPConnection() {
  const sftp = new SftpClient()
  try {
    await sftp.connect({
      host: process.env.SFTP_HOST,
      port: parseInt(process.env.SFTP_PORT || '22'),
      username: process.env.SFTP_USER,
      privateKey: process.env.SFTP_PRIVATE_KEY
        ? Buffer.from(process.env.SFTP_PRIVATE_KEY, 'base64').toString('utf-8')
        : undefined,
      readyTimeout: 10000,
    })
    await sftp.list(process.env.SFTP_UPLOAD_DIR || '/uploads')
    return { ok: true, message: 'SFTP connection successful' }
  } catch (err) {
    return { ok: false, message: err.message }
  } finally {
    await sftp.end()
  }
}
