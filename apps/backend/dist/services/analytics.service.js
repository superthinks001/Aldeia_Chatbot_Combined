"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnalyticsService = void 0;
const database_1 = require("../config/database");
const logger_1 = require("../utils/logger");
class AnalyticsService {
    /**
     * Log an analytics event
     */
    static async logEvent(event) {
        try {
            const { error } = await database_1.supabase
                .from('analytics')
                .insert({
                user_id: event.user_id,
                conversation_id: event.conversation_id,
                event_type: event.event_type,
                message: event.message,
                metadata: event.metadata ? JSON.stringify(event.metadata) : null
            });
            if (error) {
                logger_1.logger.error('Failed to log analytics event:', error);
                return false;
            }
            return true;
        }
        catch (error) {
            logger_1.logger.error('Error in logEvent:', error);
            return false;
        }
    }
    /**
     * Get analytics summary for a user
     */
    static async getUserAnalyticsSummary(userId) {
        try {
            const { data, error } = await database_1.supabase
                .from('analytics')
                .select('event_type, metadata')
                .eq('user_id', userId);
            if (error) {
                logger_1.logger.error('Failed to get user analytics summary:', error);
                return null;
            }
            // Count events by type
            const summary = {};
            data?.forEach((row) => {
                summary[row.event_type] = (summary[row.event_type] || 0) + 1;
            });
            return {
                userId,
                totalEvents: data?.length || 0,
                eventCounts: summary
            };
        }
        catch (error) {
            logger_1.logger.error('Error in getUserAnalyticsSummary:', error);
            return null;
        }
    }
    /**
     * Get overall analytics summary
     */
    static async getOverallSummary() {
        try {
            const { data, error } = await database_1.supabase
                .from('analytics')
                .select('event_type, user_id');
            if (error) {
                logger_1.logger.error('Failed to get overall analytics summary:', error);
                return null;
            }
            // Count events by type
            const eventCounts = {};
            const uniqueUsers = new Set();
            data?.forEach((row) => {
                eventCounts[row.event_type] = (eventCounts[row.event_type] || 0) + 1;
                uniqueUsers.add(row.user_id);
            });
            return {
                totalEvents: data?.length || 0,
                totalUsers: uniqueUsers.size,
                eventCounts
            };
        }
        catch (error) {
            logger_1.logger.error('Error in getOverallSummary:', error);
            return null;
        }
    }
    /**
     * Get recent analytics events
     */
    static async getRecentEvents(limit = 100, userId) {
        try {
            let query = database_1.supabase
                .from('analytics')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(limit);
            if (userId) {
                query = query.eq('user_id', userId);
            }
            const { data, error } = await query;
            if (error) {
                logger_1.logger.error('Failed to get recent events:', error);
                return [];
            }
            return data || [];
        }
        catch (error) {
            logger_1.logger.error('Error in getRecentEvents:', error);
            return [];
        }
    }
    /**
     * Get analytics by conversation
     */
    static async getConversationAnalytics(conversationId) {
        try {
            const { data, error } = await database_1.supabase
                .from('analytics')
                .select('*')
                .eq('conversation_id', conversationId)
                .order('created_at', { ascending: true });
            if (error) {
                logger_1.logger.error('Failed to get conversation analytics:', error);
                return [];
            }
            return data || [];
        }
        catch (error) {
            logger_1.logger.error('Error in getConversationAnalytics:', error);
            return [];
        }
    }
    /**
     * Count events by type for a user
     */
    static async countEventsByType(userId, eventType) {
        try {
            const { count, error } = await database_1.supabase
                .from('analytics')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', userId)
                .eq('event_type', eventType);
            if (error) {
                logger_1.logger.error('Failed to count events by type:', error);
                return 0;
            }
            return count || 0;
        }
        catch (error) {
            logger_1.logger.error('Error in countEventsByType:', error);
            return 0;
        }
    }
}
exports.AnalyticsService = AnalyticsService;
exports.default = AnalyticsService;
