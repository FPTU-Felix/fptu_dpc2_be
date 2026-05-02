// Trang thai nhin o cap ho so tong the -> tra loi cau hoi ho so nay hien dang o trinh trang gi neu nhin tu ngoai vao

export enum AdmissionOverallStatus {
  DRAFT = 'DRAFT', // QCUT dang tao ho so, chua submit
  IN_PROGRESS = 'IN_PROGRESS', // da submit va dang chay trong quy trinh
  RETURNED = 'RETURNED', // dang bi tra ve o buoc hien tai de bo dsung
  REJECTED = 'REJECTED', // bi tu choi han, flow dung
  APPROVED = 'APPROVED', // hoan thanh toan bo quy trinh
  CANCELLED = 'CANCELLED', // huy ho so
}
