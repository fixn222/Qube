import { Injectable, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';
import { and, eq, isNull } from 'drizzle-orm';
import { DrizzleService } from '../db/drizzle.service';
import { organizations, orgMembers, users } from '../db/schema';
import { INVITE_EXPIRES_IN } from '@qube/constants';

interface InvitePayload {
  email: string;
  orgId: string;
  orgName: string;
}

@Injectable()
export class InviteService {
  private resend: Resend;

  constructor(
    private drizzle: DrizzleService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {
    this.resend = new Resend(this.configService.get('RESEND_API_KEY'));
  }

  async sendInvite(orgSlug: string, email: string) {
    // get the org
    const [org] = await this.drizzle.db
      .select()
      .from(organizations)
      .where(eq(organizations.slug, orgSlug))
      .limit(1);

    if (!org) throw new BadRequestException('Organization not found');

    // check if user is already an active member
    const existingUser = await this.drizzle.db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (existingUser.length > 0) {
      const existingMember = await this.drizzle.db
        .select()
        .from(orgMembers)
        .where(
          and(
            eq(orgMembers.orgId, org.id),
            eq(orgMembers.userId, existingUser[0].id),
            isNull(orgMembers.removedAt),
          ),
        )
        .limit(1);

      if (existingMember.length > 0) {
        throw new BadRequestException(
          'User is already a member of this organization',
        );
      }
    }

    // sign invite token — expires in 24h
    const token = this.jwtService.sign(
      { email, orgId: org.id, orgName: org.name } satisfies InvitePayload,
      {
        secret: this.configService.get('INVITE_SECRET'),
        expiresIn: INVITE_EXPIRES_IN,
      },
    );

    const inviteUrl = `${this.configService.get<string>('API_URL')}/auth/invite/accept?token=${token}`;

    // send the email via Resend
   const sended = await this.resend.emails.send({
      from:'"qube <onboarding@resend.dev>',
      to: email,
      subject: `You've been invited to join ${org.name} on Qube`,
      html: `
        <!DOCTYPE html>
<html lang="en">
  <body
    style="
      margin:0;
      padding:40px 20px;
      background:#f5f7fb;
      font-family:Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;
      color:#111827;
    "
  >
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
      <tr>
        <td align="center">

          <table
            width="600"
            cellpadding="0"
            cellspacing="0"
            role="presentation"
            style="
              max-width:600px;
              background:#ffffff;
              border-radius:24px;
              overflow:hidden;
              border:1px solid #e5e7eb;
              box-shadow:0 20px 60px rgba(0,0,0,.06);
            "
          >

            <!-- Hero -->
            <tr>
              <td
                style="
                  background:#0f172a;
                  padding:56px 48px;
                  text-align:center;
                "
              >

                <div
                  style="
                    width:64px;
                    height:64px;
                    border-radius:18px;
                    background:linear-gradient(135deg,#4f46e5,#7c3aed);
                    display:inline-block;
                    line-height:64px;
                    color:#fff;
                    font-size:30px;
                    font-weight:700;
                    text-align:center;
                  "
                >
                  Q
                </div>

                <h1
                  style="
                    color:#fff;
                    margin:24px 0 10px;
                    font-size:34px;
                    font-weight:700;
                    letter-spacing:-1px;
                  "
                >
                  Welcome to Qube
                </h1>

                <p
                  style="
                    color:#94a3b8;
                    font-size:17px;
                    line-height:28px;
                    margin:0;
                  "
                >
                  Modern collaboration for modern teams.
                </p>

              </td>
            </tr>

            <!-- Body -->
            <tr>
              <td style="padding:48px;">

                <div
                  style="
                    display:inline-block;
                    background:#eef2ff;
                    color:#4f46e5;
                    padding:8px 14px;
                    border-radius:999px;
                    font-size:13px;
                    font-weight:600;
                  "
                >
                  Team Invitation
                </div>

                <h2
                  style="
                    margin:24px 0 16px;
                    font-size:32px;
                    line-height:1.2;
                    color:#111827;
                  "
                >
                  You're invited to join
                  <br>
                  <span style="color:#4f46e5;">${org.name}</span>
                </h2>

                <p
                  style="
                    font-size:16px;
                    line-height:30px;
                    color:#4b5563;
                    margin:0;
                  "
                >
                  You've been invited to collaborate on
                  <strong>Qube</strong>.
                  Join your workspace to manage projects,
                  collaborate with teammates,
                  and stay organized.
                </p>

                <!-- CTA -->
                <table
                  cellpadding="0"
                  cellspacing="0"
                  role="presentation"
                  style="margin:40px 0;"
                >
                  <tr>
                    <td
                      style="
                        border-radius:14px;
                        background:#111827;
                      "
                    >
                      <a
                        href="${inviteUrl}"
                        style="
                          display:block;
                          padding:18px 34px;
                          color:#fff;
                          text-decoration:none;
                          font-size:16px;
                          font-weight:600;
                        "
                      >
                        Accept Invitation →
                      </a>
                    </td>
                  </tr>
                </table>

                <!-- Info Card -->
                <table
                  width="100%"
                  cellpadding="0"
                  cellspacing="0"
                  role="presentation"
                  style="
                    background:#fafafa;
                    border:1px solid #ececec;
                    border-radius:16px;
                  "
                >
                  <tr>
                    <td style="padding:28px;">

                      <table width="100%">
                        <tr>

                          <td>

                            <div
                              style="
                                color:#9ca3af;
                                font-size:12px;
                                text-transform:uppercase;
                                letter-spacing:.08em;
                              "
                            >
                              Organization
                            </div>

                            <div
                              style="
                                margin-top:8px;
                                font-size:18px;
                                font-weight:600;
                              "
                            >
                              ${org.name}
                            </div>

                          </td>

                          <td align="right">

                            <div
                              style="
                                color:#9ca3af;
                                font-size:12px;
                                text-transform:uppercase;
                              "
                            >
                              Expires
                            </div>

                            <div
                              style="
                                margin-top:8px;
                                font-size:18px;
                                font-weight:600;
                                color:#ef4444;
                              "
                            >
                              24 Hours
                            </div>

                          </td>

                        </tr>
                      </table>

                    </td>
                  </tr>
                </table>

                <p
                  style="
                    margin:36px 0 12px;
                    color:#6b7280;
                    font-size:14px;
                  "
                >
                  If the button doesn't work, use this link:
                </p>

                <p
                  style="
                    margin:0;
                    font-size:13px;
                    word-break:break-all;
                    color:#4f46e5;
                  "
                >
                  ${inviteUrl}
                </p>

              </td>
            </tr>

            <!-- Footer -->
            <tr>
              <td
                style="
                  padding:32px;
                  border-top:1px solid #f3f4f6;
                  text-align:center;
                  font-size:13px;
                  color:#9ca3af;
                "
              >

                © 2026 Qube

                <br><br>

                This invitation was sent because someone invited you to join
                <strong>${org.name}</strong>.

                <br>

                If you weren't expecting this email, you can safely ignore it.

              </td>
            </tr>

          </table>

        </td>
      </tr>
    </table>
  </body>
</html>
      `,
    });
    if (sended.error) {
       return {message : 'mail not sent'}      
    }
    
  }

  async acceptInvite(token: string) {
    let payload: InvitePayload;

    try {
      payload = this.jwtService.verify<InvitePayload>(token, {
        secret: this.configService.get('INVITE_SECRET'),
      });
    } catch {
      throw new BadRequestException('Invalid or expired invite link');
    }

    let [user] = await this.drizzle.db
      .select()
      .from(users)
      .where(eq(users.email, payload.email))
      .limit(1);

    if (!user) {
      const [newUser] = await this.drizzle.db
        .insert(users)
        .values({ email: payload.email })
        .returning();
      user = newUser;
    }

    const existing = await this.drizzle.db
      .select()
      .from(orgMembers)
      .where(
        and(
          eq(orgMembers.orgId, payload.orgId),
          eq(orgMembers.userId, user.id),
          isNull(orgMembers.removedAt),
        ),
      )
      .limit(1);

    if (existing.length > 0) {
      return { message: 'Already a member' };
    }

    await this.drizzle.db.insert(orgMembers).values({
      orgId: payload.orgId,
      userId: user.id,
      role: 'developer',
    });

    return { message: 'Invite accepted', email: user.email };
  }

}