export const jwtConfig = {
    accessToken :{
        secret: process.env.JWT_SECRET,
        expireIn: process.env.JWT_EXPIRE || '2m'
    },
    refreshToken :{
        secret: process.env.JWT_REFRESH_SECRET,
        expireIn: process.env.JWT_REFRESH_EXPIRE || '2m'
    }
}

if (!process.env.JWT_SECRET){
    throw new Error ('JWT_SECRET must be defined')
}