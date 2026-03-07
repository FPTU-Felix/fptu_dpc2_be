import { Test, TestingModule } from '@nestjs/testing';
import { RolesService } from './roles.service';

describe('RolesService', () => {
  let service: RolesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RolesService],
    }).compile();

    service = module.get<RolesService>(RolesService);
  });

  it('TC01: create should return success message', () => {
    expect(service.create({})).toBe('This action adds a new role');
  });

  it('TC01: findAll should return all roles message', () => {
    expect(service.findAll()).toBe('This action returns all roles');
  });

  it('TC01: findOne should return role with correct ID', () => {
    expect(service.findOne(123)).toBe('This action returns a #123 role');
  });

  it('TC01: update should return update message with ID', () => {
    expect(service.update(123, {})).toBe('This action updates a #123 role');
  });

  it('TC01: remove should return removal message with ID', () => {
    expect(service.remove(123)).toBe('This action removes a #123 role');
  });
});