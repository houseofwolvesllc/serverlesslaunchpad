export abstract class JwtVerifier {
    abstract verify(accessToken: string): Promise<boolean>;
}
