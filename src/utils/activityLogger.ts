import { Request } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { ActivityLog } from '../models';

export interface LogActivityParams {
  villageId?: string | null;
  userId?: string | null;
  userName?: string | null;
  userEmail?: string | null;
  userRole?: string | null;
  action: string;
  targetId?: string | null;
  targetName?: string | null;
  description: string;
  details?: any;
  req?: Request;
}

/**
 * Mencatat log aktivitas audit ke tabel database activity_logs.
 * Dijalankan secara async dan aman (tidak akan pernah melempar exception ke pemanggil).
 */
export const logActivity = async (params: LogActivityParams): Promise<void> => {
  try {
    const {
      villageId,
      userId,
      userName,
      userEmail,
      userRole,
      action,
      targetId,
      targetName,
      description,
      details,
      req,
    } = params;

    let ip: string | null = null;
    let userAgent: string | null = null;

    if (req) {
      const forwarded = req.headers['x-forwarded-for'];
      if (typeof forwarded === 'string') {
        ip = forwarded.split(',')[0].trim();
      } else if (Array.isArray(forwarded) && forwarded.length > 0) {
        ip = forwarded[0].trim();
      } else {
        ip = req.socket?.remoteAddress || null;
      }
      userAgent = (req.headers['user-agent'] || '').substring(0, 255) || null;
    }

    const logEntry = await ActivityLog.create({
      id: `act_${uuidv4()}`,
      villageId: villageId || null,
      userId: userId || null,
      userName: userName || null,
      userEmail: userEmail || null,
      userRole: userRole || null,
      action: action.toUpperCase(),
      targetId: targetId || null,
      targetName: targetName || null,
      description,
      details: details ? details : null,
      ip,
      userAgent,
    });

    console.log(`[ACTIVITY_LOG] [${action}] ${description} (user: ${userName || userEmail || userId || 'SYSTEM'})`);
  } catch (err: any) {
    console.error('⚠️ [ACTIVITY_LOG_ERROR] Gagal menulis activity log:', err?.message || err);
  }
};
