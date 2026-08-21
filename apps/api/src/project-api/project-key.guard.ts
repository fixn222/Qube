import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { PROJECT_KEY_ROLE } from '@qube/constants';
import { Observable } from 'rxjs';

export interface ProjectKeyPayload {
    projectId : string ;
    role: typeof PROJECT_KEY_ROLE.ANON | typeof PROJECT_KEY_ROLE.SERVICE_ROLE
}

@Injectable()
export class ProjectKeyGuard implements CanActivate {
    constructor (
        private jwtService : JwtService  ,
        private configService : ConfigService,
    ){}

    canActivate(context: ExecutionContext): boolean  {
        const req = context.switchToHttp().getRequest<Request>();
        const authHeader = req.headers.authorization;

        if (!authHeader?.startsWith('Bearer')) {
            throw new UnauthorizedException('Missing Api key');
            
        }

        const token = authHeader.slice(7);

        try {
            const payload = this.jwtService.verify<ProjectKeyPayload>(token , {
                secret : this.configService.get<string>('PROJECT_JWT_SECRET')
            })

            req['projectKey'] = payload;
            return true
        } catch (error) {
            throw new UnauthorizedException('Invalid API key');
        }
        
    }
}