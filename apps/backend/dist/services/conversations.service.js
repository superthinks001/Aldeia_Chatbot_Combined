"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConversationsService = void 0;
const database_1 = require("../config/database");
const logger_1 = require("../utils/logger");
class ConversationsService {
    /**
     * Create or get existing conversation for a user
     */
    static async createOrGetConversation(userId, conversationId, title, language) {
        try {
            // If conversationId provided, fetch existing conversation
            if (conversationId) {
                const { data, error } = await database_1.supabase
                    .from('conversations')
                    .select('*')
                    .eq('id', conversationId) // UUID - use as string
                    .eq('user_id', userId)
                    .single();
                if (!error && data) {
                    return data;
                }
            }
            // Create new conversation
            const { data, error } = await database_1.supabase
                .from('conversations')
                .insert({
                user_id: userId,
                title: title || null,
                status: 'active',
                language: language || 'en'
                // created_at and updated_at set by default
            })
                .select()
                .single();
            if (error) {
                logger_1.logger.error('Failed to create conversation:', error);
                return null;
            }
            return data;
        }
        catch (error) {
            logger_1.logger.error('Error in createOrGetConversation:', error);
            return null;
        }
    }
    /**
     * Add message to conversation
     */
    static async addMessage(conversationId, // UUID
    sender, message, metadata) {
        try {
            const { data, error } = await database_1.supabase
                .from('conversation_messages')
                .insert({
                conversation_id: conversationId,
                sender,
                message,
                intent: metadata?.intent,
                confidence: metadata?.confidence,
                bias: metadata?.bias,
                ambiguous: metadata?.ambiguous,
                metadata: metadata ? JSON.stringify(metadata) : null
            })
                .select()
                .single();
            if (error) {
                logger_1.logger.error('Failed to add message:', error);
                return null;
            }
            // Update conversation's updated_at timestamp (trigger handles this automatically)
            // No need to manually update - PostgreSQL trigger updates updated_at on any conversation update
            return data;
        }
        catch (error) {
            logger_1.logger.error('Error in addMessage:', error);
            return null;
        }
    }
    /**
     * Get conversation history
     */
    static async getConversationHistory(conversationId, // UUID
    limit = 10) {
        try {
            const { data, error } = await database_1.supabase
                .from('conversation_messages')
                .select('*')
                .eq('conversation_id', conversationId)
                .order('created_at', { ascending: true })
                .limit(limit);
            if (error) {
                logger_1.logger.error('Failed to get conversation history:', error);
                return [];
            }
            return data || [];
        }
        catch (error) {
            logger_1.logger.error('Error in getConversationHistory:', error);
            return [];
        }
    }
    /**
     * Get user's conversations
     */
    static async getUserConversations(userId, limit = 20) {
        try {
            const { data, error } = await database_1.supabase
                .from('conversations')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: false })
                .limit(limit);
            if (error) {
                logger_1.logger.error('Failed to get user conversations:', error);
                return [];
            }
            return data || [];
        }
        catch (error) {
            logger_1.logger.error('Error in getUserConversations:', error);
            return [];
        }
    }
    /**
     * Archive a conversation (change status to 'archived')
     */
    static async archiveConversation(conversationId) {
        try {
            const { error } = await database_1.supabase
                .from('conversations')
                .update({ status: 'archived' })
                .eq('id', conversationId);
            if (error) {
                logger_1.logger.error('Failed to archive conversation:', error);
                return false;
            }
            return true;
        }
        catch (error) {
            logger_1.logger.error('Error in archiveConversation:', error);
            return false;
        }
    }
    /**
     * Update conversation details (title, status, language)
     */
    static async updateConversation(conversationId, updates) {
        try {
            const { error } = await database_1.supabase
                .from('conversations')
                .update(updates)
                .eq('id', conversationId);
            if (error) {
                logger_1.logger.error('Failed to update conversation:', error);
                return false;
            }
            return true;
        }
        catch (error) {
            logger_1.logger.error('Error in updateConversation:', error);
            return false;
        }
    }
}
exports.ConversationsService = ConversationsService;
exports.default = ConversationsService;
