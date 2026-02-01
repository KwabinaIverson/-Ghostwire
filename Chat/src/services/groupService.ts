import { CreateGroupDto } from "../dtos/groupDTO.ts";
import { GroupRepository } from "../repositories/GroupRepository.ts";
import { Group } from "../domain/Group.ts";

/**
 * Service layer responsible for group-related business logic.
 *
 * Responsibilities:
 * - Create groups and coordinate related persistence operations.
 * - Query groups for a specific user.
 *
 * Notes:
 * - Consider wrapping `createGroup` steps in a DB transaction (create + addMember)
 *   to ensure atomicity if either operation can fail independently.
 * - Validate DTO inputs before calling service methods (DTO has `validate()`).
 * - The method returns a minimal representation of the created group (no member list).
 */
export class GroupService {
  /**
   * Repository instance used for group persistence operations.
   */
  private groupRepo: GroupRepository;

  /**
   * Construct a new GroupService and initialize the repository.
   */
  constructor() {
    this.groupRepo = new GroupRepository();
  }

  /**
   * Create a new group and add the creator as the first member.
   *
   * Steps:
   * 1. Instantiate the `Group` domain entity (constructor assigns ID).
   * 2. Persist the group using `GroupRepository.create`.
   * 3. Add the admin as the first member using `GroupRepository.addMember`.
   *
   * @param dto - `CreateGroupDto` containing name, description and adminId.
   * @returns A promise resolving to a minimal group object: `{ id, name, description }`.
   * @throws Error when persistence operations fail.
   *
   * Implementation notes:
   * - Use transactions for production-grade atomicity.
   * - Ensure DTO validation is performed before calling this method.
   */
  public async createGroup(dto: CreateGroupDto, extraMemberIds: string[] = []): Promise<any> {
    console.log('GroupService.createGroup: dto=', dto);
    const group = new Group(dto.name, dto.description, dto.adminId);
    console.log('GroupService.createGroup: group=', { id: group.id, name: group.name, adminId: group.adminId, createdAt: group.createdAt });

    // Perform the create and addMember(s) inside a single transaction to ensure atomicity
    await (await import('../config/Database.ts')).Database.transaction(async (conn) => {
      await this.groupRepo.create(group, conn);
      await this.groupRepo.addMember(group.id, dto.adminId, conn);
      for (const mid of extraMemberIds) {
        await this.groupRepo.addMember(group.id, mid, conn);
      }
      return true;
    });

    return {
      id: group.id,
      name: group.name,
      description: group.description
    };
  }

  /**
   * Get groups that a particular user belongs to.
   *
   * @param userId - The id of the user to query groups for.
   * @returns A promise resolving to an array of raw group rows (map to domain if needed).
   */
  public async getUserGroups(userId: string) {
    return await this.groupRepo.findUserGroups(userId);
  }

  /**
   * Count groups by admin id.
   */
  public async countGroupsByAdmin(adminId: string) {
    return await this.groupRepo.countByAdmin(adminId);
  }

  /**
   * Add multiple userIds to a group.
   */
  public async addMembers(groupId: string, userIds: string[]) {
    for (const id of userIds) {
      await this.groupRepo.addMember(groupId, id);
    }
  }
}