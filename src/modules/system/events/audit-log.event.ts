export class AuditLogEvent {
  constructor(
    public readonly actorId: string, // Ai làm?
    public readonly actionType: string, // Làm hành động gì? (VD: UPDATE_MEMBER)
    public readonly entityName: string, // Tác động lên bảng nào?
    public readonly entityId: string, // Tác động lên dòng nào?
    public readonly details: any, // Cũ thế nào, mới ra sao?
    public readonly ipAddress?: string,
  ) {}
}
