import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { PartyAdmissionWorkflowLogEntity } from "../entities/party-admission-workflow-log.entity";

@Injectable()
export class AdmissionWorkflowLogService {
    constructor(
        @InjectRepository(PartyAdmissionWorkflowLogEntity)
        private readonly workflowLogRepo: Repository<PartyAdmissionWorkflowLogEntity>,
    ) {}

    async createLog(params: Partial<PartyAdmissionWorkflowLogEntity>) {
        const log = this.workflowLogRepo.create(params);
        return await this.workflowLogRepo.save(log);
    }
}